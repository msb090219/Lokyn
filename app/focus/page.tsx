'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Play, Pause, LogOut, Clock, Timer, Flame, Calendar, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import AppHeader from '@/components/app-header'
import { cn } from '@/lib/utils'
import { SessionTaskList } from '@/components/session-task-list'
import { AddTaskModal } from '@/components/add-task-modal'
import type { StudySessionWithTasks } from '@/lib/types'

interface StudySession {
  id: string
  task_id: string | null
  title: string
  started_at: string
  tasks?: Array<{ id: string; task_id: string; completed: boolean; task: { id: string; text: string } }>
}

interface Task {
  id: string
  text: string
}

// BroadcastChannel for cross-tab communication
const SESSION_CHANNEL = 'study_session_channel'

export default function FocusPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Timer state
  const [timerState, setTimerState] = useState({
    isRunning: false,
    isPaused: false,
    remainingSeconds: 25 * 60,
    totalSeconds: 25 * 60,
    type: 'study' as 'study' | 'break',
    startedAt: null as Date | null,
  })

  // Session state
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState('Study Session')

  // User preferences
  const [studyDuration, setStudyDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [tasks, setTasks] = useState<Task[]>([])

  // Stats state
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // UI state
  const [showTitlePrompt, setShowTitlePrompt] = useState(false)
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<'normal' | 'long' | 'custom'>('normal')

  // Session tasks state
  const [sessionTasks, setSessionTasks] = useState<Array<{
    id: string
    task_id: string
    task: { id: string; text: string }
    completed: boolean
    position: number
  }>>([])

  const [showAddTaskModal, setShowAddTaskModal] = useState(false)

  // Focus mode state
  const [focusMode, setFocusMode] = useState(false)
  const [showToggleButton, setShowToggleButton] = useState(true)
  const mouseActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mouseMoveCountRef = useRef(0)
  const fullscreenInitiatedRef = useRef(false)

  // BroadcastChannel for cross-tab communication
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isMasterTab = useRef(true)

  // Store handleTimerComplete in a ref to avoid circular dependency issues
  const handleTimerCompleteRef = useRef<(() => Promise<void>) | null>(null)

  // Load user data and active session
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        const authResponse = await supabase.auth.getUser()
        const { data, error: authError } = authResponse
        const authUser = data?.user

        if (authError || !authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        // Load user profile
        const { data: profile } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        if (profile) {
          setUserProfile(profile)
        }

        // Load user preferences for timer durations
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('study_duration, break_duration')
          .eq('user_id', authUser.id)
          .single()

        if (prefs) {
          const studyDur = (prefs as any).study_duration || 25
          const breakDur = (prefs as any).break_duration || 5
          setStudyDuration(studyDur)
          setBreakDuration(breakDur)
          setTimerState(prev => ({
            ...prev,
            remainingSeconds: studyDur * 60,
            totalSeconds: studyDur * 60,
          }))
        }

        // Load tasks for dropdown
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, text')
          .eq('user_id', authUser.id)
          .eq('completed', false)
          .order('created_at', { ascending: false })
          .limit(20)

        if (tasksData) {
          setTasks(tasksData as Task[])
        }

        // Load stats
        try {
          const statsResponse = await fetch('/api/study-stats')
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            setTodayMinutes(statsData.timeMetrics?.today_minutes || 0)
            setCurrentStreak(statsData.streak?.current_streak || 0)
          }
        } catch (error) {
          // Stats loading failed, but don't block the page
        }

        // Check for active session
        const response = await fetch('/api/study-sessions/active')
        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            const activeSession = data.session as StudySession
            setCurrentSession(activeSession)
            setSelectedTaskId(activeSession.task_id)
            setSessionTitle(activeSession.title)

            // Parse tasks and ensure position is set
            const tasksWithPosition = (activeSession.tasks || []).map((t: any) => ({
              ...t,
              position: t.position ?? 0,
            }))
            setSessionTasks(tasksWithPosition)

            const startedAt = new Date(activeSession.started_at)
            const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000)
            const remaining = Math.max(0, (studyDuration * 60) - elapsedSeconds)

            setTimerState(prev => ({
              ...prev,
              isRunning: true,
              remainingSeconds: remaining,
              startedAt: startedAt,
            }))
          }
        }
      } catch (error) {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Setup BroadcastChannel
    if (typeof window !== 'undefined') {
      channelRef.current = new BroadcastChannel(SESSION_CHANNEL)

      channelRef.current.onmessage = (event) => {
        const { type, data } = event.data

        switch (type) {
          case 'SESSION_STARTED':
            if (!currentSession && data.session) {
              isMasterTab.current = false
              setCurrentSession(data.session)
              setTimerState(prev => ({
                ...prev,
                isRunning: false,
              }))
              toast.info('Session started in another tab')
            }
            break

          case 'SESSION_COMPLETED':
            setCurrentSession(null)
            setSessionTasks([])
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              isPaused: false,
              remainingSeconds: studyDuration * 60,
            }))
            break

          case 'TIMER_TICK':
            if (!isMasterTab.current) {
              setTimerState(prev => ({
                ...prev,
                remainingSeconds: data.remainingSeconds,
              }))
            }
            break

          case 'TASK_TOGGLED':
            setSessionTasks(prev =>
              prev.map(st =>
                st.id === data.sessionTaskId
                  ? { ...st, completed: data.completed }
                  : st
              )
            )
            break

          case 'TASK_ADDED':
            setSessionTasks(prev => [...prev, ...data.tasks])
            break

          case 'TASK_REMOVED':
            setSessionTasks(prev => prev.filter(st => st.id !== data.taskId))
            break
        }
      }
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close()
      }
    }
  }, [])

  // Timer tick effect
  useEffect(() => {
    if (!timerState.isRunning || timerState.isPaused) return

    const interval = setInterval(() => {
      setTimerState(prev => {
        if (prev.remainingSeconds <= 1) {
          // Timer completed - mark as not running
          setTimeout(() => {
            if (handleTimerCompleteRef.current) {
              handleTimerCompleteRef.current()
            }
          }, 0)
          return { ...prev, isRunning: false, remainingSeconds: 0 }
        }

        const newRemaining = prev.remainingSeconds - 1

        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'TIMER_TICK',
            data: { remainingSeconds: newRemaining },
          })
        }

        return { ...prev, remainingSeconds: newRemaining }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerState.isRunning, timerState.isPaused])

  // Focus mode auto-hide behavior
  useEffect(() => {
    if (!focusMode) {
      setShowToggleButton(true)
      return
    }

    setShowToggleButton(true)

    const handleMouseMove = () => {
      mouseMoveCountRef.current += 1
      if (mouseMoveCountRef.current % 10 === 0) {
        setShowToggleButton(true)
        if (mouseActivityTimeoutRef.current) {
          clearTimeout(mouseActivityTimeoutRef.current)
        }
        mouseActivityTimeoutRef.current = setTimeout(() => {
          setShowToggleButton(false)
        }, 5000)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (mouseActivityTimeoutRef.current) {
        clearTimeout(mouseActivityTimeoutRef.current)
      }
    }
  }, [focusMode])

  // Fullscreen change listener - detect ESC key
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && focusMode && fullscreenInitiatedRef.current) {
        // User exited fullscreen via ESC, exit focus mode too
        fullscreenInitiatedRef.current = false
        setFocusMode(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [focusMode])

  // Navigation warning when timer is running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerState.isRunning && !timerState.isPaused) {
        // Modern browsers require this to show the confirmation dialog
        const message = 'You have an active study session. If you leave, this session will not be recorded. Are you sure you want to leave?'
        e.preventDefault()
        e.returnValue = message // Chrome requires returnValue to be set
        return message // Other browsers
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [timerState.isRunning, timerState.isPaused])

  // Intercept in-app navigation when timer is running
  const handleNavigationAttempt = async (): Promise<boolean> => {
    if (timerState.isRunning && !timerState.isPaused) {
      const confirmed = window.confirm('You have an active study session. If you leave, this session will not be recorded. Are you sure you want to leave?')
      return confirmed
    }
    return true // Allow navigation if timer is not running
  }

  const handleTimerComplete = async () => {
    try {
      const audio = new Audio('/notification.mp3')
      await audio.play()
    } catch (e) {
      // Could not play notification sound
    }

    if (timerState.type === 'study') {
      setShowTitlePrompt(true)
    } else {
      await completeSession()
    }
  }

  // Update the ref whenever handleTimerComplete changes
  useEffect(() => {
    handleTimerCompleteRef.current = handleTimerComplete
  }, [timerState.type])

  const completeSession = async (customTitle?: string) => {
    if (!currentSession) return

    try {
      const response = await fetch(`/api/study-sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle || sessionTitle,
          completed_at: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        // Reload stats after completion
        try {
          const statsResponse = await fetch('/api/study-stats')
          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            setTodayMinutes(statsData.timeMetrics?.today_minutes || 0)
            setCurrentStreak(statsData.streak?.current_streak || 0)
          }
        } catch (error) {
          // Stats refresh failed, but don't block
        }

        toast.success('Session completed!')

        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'SESSION_COMPLETED',
          })
        }

        setCurrentSession(null)
        setSessionTasks([])
        setShowTitlePrompt(false)

        // Auto-transition to next session type
        const wasStudySession = timerState.type === 'study'
        const nextType = wasStudySession ? 'break' : 'study'
        const nextDuration = nextType === 'study' ? studyDuration : breakDuration

        setTimerState({
          isRunning: false,
          isPaused: false,
          remainingSeconds: nextDuration * 60,
          totalSeconds: nextDuration * 60,
          type: nextType,
          startedAt: null,
        })

        // Auto-start the next session after a short delay
        setTimeout(() => {
          startTimer()
        }, 1000)
      }
    } catch (error) {
      toast.error('Failed to complete session')
    }
  }

  const startTimer = async () => {
    try {
      const duration = timerState.type === 'study' ? studyDuration : breakDuration

      // Try to save to database, but don't let it block the timer
      fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_ids: sessionTasks.map(st => st.task_id),
          title: timerState.type === 'study' ? sessionTitle : 'Break',
          duration_minutes: duration,
          type: timerState.type,
        }),
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json()
          const newSession = data.session as StudySession
          setCurrentSession(newSession)
        }
      }).catch(() => {
        // Silently fail - timer will still work
      })

      // Start the timer immediately
      isMasterTab.current = true
      setTimerState({
        isRunning: true,
        isPaused: false,
        remainingSeconds: duration * 60,
        totalSeconds: duration * 60,
        type: timerState.type,
        startedAt: new Date(),
      })

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'SESSION_STARTED',
          data: { session: null },
        })
      }

      toast.success(`${timerState.type === 'study' ? 'Study' : 'Break'} session started!`)
    } catch (error) {
      toast.error('Failed to start session')
    }
  }

  const pauseTimer = () => {
    setTimerState(prev => ({ ...prev, isPaused: true }))
  }

  const resumeTimer = () => {
    setTimerState(prev => ({ ...prev, isPaused: false }))
  }

  const resetTimer = async () => {
    if (currentSession) {
      fetch(`/api/study-sessions/${currentSession.id}`, {
        method: 'DELETE',
      }).catch(() => {})
    }

    setCurrentSession(null)
    setSessionTasks([])
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      remainingSeconds: prev.totalSeconds,
      startedAt: null,
    }))
    // Exit focus mode when timer is reset
    await exitFocusMode()
  }

  const toggleTimerType = () => {
    const newType = timerState.type === 'study' ? 'break' : 'study'
    const newDuration = newType === 'study' ? studyDuration : breakDuration

    setTimerState(prev => ({
      ...prev,
      type: newType,
      remainingSeconds: newDuration * 60,
      totalSeconds: newDuration * 60,
    }))
  }

  const enterFocusMode = async () => {
    try {
      fullscreenInitiatedRef.current = true
      await document.documentElement.requestFullscreen()
    } catch (error) {
      // Fullscreen failed (permission denied, not supported, etc.)
      console.warn('Fullscreen not available:', error)
      // Still enter focus mode even without fullscreen
    } finally {
      setFocusMode(true)
    }
  }

  const exitFocusMode = async () => {
    if (document.fullscreenElement && fullscreenInitiatedRef.current) {
      try {
        await document.exitFullscreen()
      } catch (error) {
        console.warn('Error exiting fullscreen:', error)
      }
    }
    fullscreenInitiatedRef.current = false
    setFocusMode(false)
  }

  const setDurationPreset = (study: number, breakTime: number, preset: 'normal' | 'long' | 'custom' = 'normal') => {
    handleDurationChange(study, breakTime)
    setSelectedPreset(preset)
    setShowDurationModal(false)
    const presetName = preset === 'normal' ? 'Normal' : preset === 'long' ? 'Long' : 'Custom'
    toast.success(`${presetName} session: ${study}min study / ${breakTime}min break`)
  }

  const handleDurationChange = (study: number, breakTime: number) => {
    setStudyDuration(study)
    setBreakDuration(breakTime)

    // Save to user preferences
    const supabase = createClient()
    supabase
      .from('user_preferences')
      .update({
        study_duration: study,
        break_duration: breakTime,
      })
      .eq('user_id', user.id)
      .then()

    // Update timer if not running
    if (!timerState.isRunning) {
      const duration = timerState.type === 'study' ? study : breakTime
      setTimerState(prev => ({
        ...prev,
        remainingSeconds: duration * 60,
        totalSeconds: duration * 60,
      }))
    }

    toast.success(`Timer updated: ${study}/${breakTime}`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60)
    const minutes = mins % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handleToggleTaskCompletion = async (sessionTaskId: string, completed: boolean) => {
    // Optimistic update
    setSessionTasks(prev =>
      prev.map(st =>
        st.id === sessionTaskId ? { ...st, completed } : st
      )
    )

    // If there's an active session, sync to API
    if (currentSession) {
      try {
        await fetch(`/api/study-sessions/${currentSession.id}/tasks/${sessionTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
        })

        // Broadcast to other tabs
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'TASK_TOGGLED',
            data: { sessionTaskId, completed },
          })
        }

        // Check if all completed
        const allCompleted = sessionTasks.every(st => st.completed)
        if (allCompleted && completed) {
          toast.success('All tasks completed! Great work!')
        }
      } catch (error) {
        // Revert on error
        setSessionTasks(prev =>
          prev.map(st =>
            st.id === sessionTaskId ? { ...st, completed: !completed } : st
          )
        )
        toast.error('Failed to update task')
      }
    } else {
      // Just update local state (already done optimistically above)
      // Check if all completed
      const allCompleted = sessionTasks.every(st => st.completed)
      if (allCompleted && completed) {
        toast.success('All tasks completed! Great work!')
      }
    }
  }

  const handleAddTasks = async (taskIds: string[]) => {
    // If there's an active session, add tasks to it via API
    if (currentSession) {
      try {
        const response = await fetch(`/api/study-sessions/${currentSession.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_ids: taskIds }),
        })

        if (response.ok) {
          const { tasks: newTasks } = await response.json()
          setSessionTasks(prev => [...prev, ...newTasks])

          // Broadcast to other tabs
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: 'TASK_ADDED',
              data: { tasks: newTasks },
            })
          }

          toast.success(`Added ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''}`)
          return
        }
      } catch (error) {
        toast.error('Failed to add tasks')
        return
      }
    }

    // If no active session, add tasks to local state (will be saved when session starts)
    const newTasks = taskIds.map((taskId, index) => ({
      id: `temp-${Date.now()}-${index}`,
      task_id: taskId,
      task: tasks.find(t => t.id === taskId)!,
      completed: false,
      position: sessionTasks.length + index,
    }))

    setSessionTasks(prev => [...prev, ...newTasks])
    toast.success(`Added ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''}`)
  }

  const handleRemoveTask = async (sessionTaskId: string) => {
    // If there's an active session, remove from API
    if (currentSession) {
      try {
        await fetch(`/api/study-sessions/${currentSession.id}/tasks/${sessionTaskId}`, {
          method: 'DELETE',
        })

        setSessionTasks(prev => prev.filter(st => st.id !== sessionTaskId))

        // Broadcast to other tabs
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'TASK_REMOVED',
            data: { taskId: sessionTaskId },
          })
        }
      } catch (error) {
        toast.error('Failed to remove task')
      }
    } else {
      // If no active session, just remove from local state
      setSessionTasks(prev => prev.filter(st => st.id !== sessionTaskId))
    }
  }

  const getProgressPercentage = () => {
    return ((timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds) * 100
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Navigation Header - HIDDEN in focus mode */}
      {!focusMode && (
        <AppHeader
          activePage="focus"
          user={user}
          userProfile={userProfile}
          onNavigationAttempt={handleNavigationAttempt}
        />
      )}

      <main className="h-[calc(100vh-64px)] flex items-center justify-center px-4 overflow-hidden">
        <div className={cn(
          "w-full transition-all duration-1000 ease-out flex flex-col",
          focusMode ? "max-w-5xl" : "max-w-md"
        )}>
          {/* Centered Timer Layout */}
          <div className={cn(
            "transition-all duration-1000 ease-out flex-1 flex flex-col justify-center",
            focusMode ? "grid md:grid-cols-2 gap-12" : "text-center gap-8"
          )}>
            {/* Timer Type Toggle - Above timer display */}
            {!timerState.isRunning && (
              <div className="md:col-span-2 mb-8">
                <Button variant="ghost" size="sm" onClick={toggleTimerType}>
                  {timerState.type === 'study' ? 'Break' : 'Study'} Timer
                </Button>
              </div>
            )}

            {/* Timer Display */}
            <div className={cn(
              "transition-all duration-1000 ease-out",
              focusMode ? "flex flex-col items-center" : ""
            )}>
              <div className={cn(
                "mb-8",
                focusMode && "mb-0"
              )}>
              <div
                className={cn(
                  "font-bold tracking-tight transition-all duration-1000 ease-out",
                  focusMode ? "text-9xl" : "text-8xl"
                )}
                style={{ fontFamily: 'monospace' }}
              >
                {formatTime(timerState.remainingSeconds)}
              </div>

              {/* Refined Linear Progress Bar with Subtle Tick */}
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto mt-8">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Duration Selector */}
              {!timerState.isRunning && (
                <div className="mt-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDurationModal(true)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Clock className="h-4 w-4" />
                    {studyDuration}min / {breakDuration}min
                  </Button>
                </div>
              )}

              {/* Timer Type Badge */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    timerState.type === 'study'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-green-500/10 text-green-500'
                  }`}
                >
                  {timerState.type === 'study' ? 'Study' : 'Break'} Session
                </span>
                {selectedPreset === 'long' && timerState.type === 'study' && (
                  <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-orange-500" />
                  </div>
                )}
                {selectedPreset === 'normal' && timerState.type === 'study' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Timer className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>

              {/* Micro Stats Section */}
              <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Today: {formatMinutes(todayMinutes)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>Streak: {currentStreak} days</span>
                </div>
              </div>
            </div>
            </div>

            {/* Session Task List */}
            <div className={cn(
              "transition-all duration-1000 ease-out",
              focusMode ? "flex flex-col max-h-[50vh] overflow-y-auto" : "mt-12 max-h-[30vh] overflow-y-auto"
            )}>
              <SessionTaskList
                tasks={sessionTasks}
                onUpdateTaskCompletion={handleToggleTaskCompletion}
                onRemoveTask={handleRemoveTask}
                onAddTask={() => setShowAddTaskModal(true)}
                disabled={timerState.isRunning}
              />
            </div>

            {/* Single Primary Action Button - HIDDEN in focus mode */}
            {!focusMode && (
              <div className="flex items-center justify-center gap-4 md:col-span-2 mt-12">
                {!timerState.isRunning ? (
                  <Button
                    size="lg"
                    onClick={startTimer}
                    className="gap-2 px-12"
                  >
                    <Play className="h-5 w-5" />
                    Start
                  </Button>
                ) : (
                  <>
                    {timerState.isPaused ? (
                      <Button size="lg" onClick={resumeTimer} className="gap-2 px-12">
                        <Play className="h-5 w-5" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={pauseTimer}
                        variant="outline"
                        className="gap-2 px-12"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </Button>
                    )}
                    <Button size="lg" onClick={resetTimer} variant="outline" className="gap-2">
                      <LogOut className="h-5 w-5" />
                      Exit
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Focus Mode Toggle - Only available when timer is running */}
      {timerState.isRunning && (
        <button
          onClick={focusMode ? exitFocusMode : enterFocusMode}
          className={cn(
            "fixed z-50 transition-all duration-500 ease-out",
            "px-6 py-3 rounded-lg border border-border bg-card/80 backdrop-blur-sm",
            "hover:border-primary hover:bg-primary hover:text-primary-foreground",
            "bottom-8 left-1/2 -translate-x-1/2",  // Always center bottom
            !showToggleButton && "opacity-0 pointer-events-none"
          )}
          aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
        >
          <span className="text-body-sm font-medium">
            {focusMode ? "Exit Focus" : "Focus Mode"}
          </span>
        </button>
      )}

      {/* Session Title Prompt */}
      {showTitlePrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h2 className="text-h4 font-bold mb-4">Session Complete!</h2>
            <p className="text-muted-foreground mb-4">
              Great work! Would you like to add a title for this session?
            </p>

            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Math Chapter 5"
              className="w-full px-3 py-2 bg-background border border-border rounded-md mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  completeSession()
                } else if (e.key === 'Escape') {
                  completeSession()
                }
              }}
            />

            <div className="flex gap-2">
              <Button onClick={() => completeSession()} className="flex-1">
                Save & Finish
              </Button>
              <Button variant="outline" onClick={() => completeSession()}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          availableTasks={tasks.filter(t =>
            !sessionTasks.some(st => st.task_id === t.id)
          )}
          selectedTaskIds={sessionTasks.map(st => st.task_id)}
          onAddTasks={handleAddTasks}
          onClose={() => setShowAddTaskModal(false)}
        />
      )}

      {/* Duration Modal */}
      {showDurationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h4 font-bold">Session Duration</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDurationModal(false)}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setDurationPreset(25, 5, 'normal')}
                className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Normal Session</div>
                    <div className="text-body-sm text-muted-foreground">25 min study / 5 min break</div>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    →
                  </div>
                </div>
              </button>

              <button
                onClick={() => setDurationPreset(50, 10, 'long')}
                className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">Long Session</div>
                    <div className="text-body-sm text-muted-foreground">50 min study / 10 min break</div>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    →
                  </div>
                </div>
              </button>

              <div className="border-t border-border pt-4 mt-4">
                <div className="text-body-sm font-semibold mb-3 text-foreground">Custom Duration</div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-caption font-medium text-muted-foreground mb-1.5 block">Study (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      defaultValue={studyDuration}
                      id="custom-study"
                      className="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors hover:border-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-caption font-medium text-muted-foreground mb-1.5 block">Break (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      defaultValue={breakDuration}
                      id="custom-break"
                      className="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors hover:border-primary"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const studyInput = document.getElementById('custom-study') as HTMLInputElement
                    const breakInput = document.getElementById('custom-break') as HTMLInputElement
                    const studyVal = parseInt(studyInput.value)
                    const breakVal = parseInt(breakInput.value)
                    if (studyVal > 0 && breakVal > 0) {
                      setDurationPreset(studyVal, breakVal, 'custom')
                    } else {
                      toast.error('Please enter valid durations')
                    }
                  }}
                >
                  Set Custom Duration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
