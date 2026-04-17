'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Pause, RotateCcw, BarChart3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AppHeader } from '@/components/app-header'
import { TimerTaskDropdown } from '@/components/timer-task-dropdown'
import { TimerSettingsMenu } from '@/components/timer-settings-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StudySession {
  id: string
  task_id: string | null
  title: string
  started_at: string
}

interface Task {
  id: string
  text: string
}

// Timer duration presets (in minutes)
const DURATION_PRESETS = [
  { label: '25/5', study: 25, break: 5 },
  { label: '50/10', study: 50, break: 10 },
]

// BroadcastChannel for cross-tab communication
const SESSION_CHANNEL = 'study_session_channel'

export default function FocusPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  // UI state
  const [focusMode, setFocusMode] = useState(false)
  const [showTitlePrompt, setShowTitlePrompt] = useState(false)
  const [isIdle, setIsIdle] = useState(false)

  // Idle detection
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef(Date.now())

  // BroadcastChannel for cross-tab communication
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isMasterTab = useRef(true)

  // Load user data and active session
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

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

        // Check for active session
        const response = await fetch('/api/study-sessions/active')
        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            const activeSession = data.session as StudySession
            setCurrentSession(activeSession)
            setSelectedTaskId(activeSession.task_id)
            setSessionTitle(activeSession.title)

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
        console.error('Error loading data:', error)
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
        }
      }
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close()
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Timer tick effect
  useEffect(() => {
    if (!timerState.isRunning || timerState.isPaused) return

    const interval = setInterval(() => {
      setTimerState(prev => {
        if (prev.remainingSeconds <= 1) {
          handleTimerComplete()
          return { ...prev, isRunning: false }
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

  // Idle detection for focus mode (visual-only, doesn't pause timer)
  useEffect(() => {
    if (!focusMode || !timerState.isRunning) return

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now()
      setIsIdle(false) // Restore visual state
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }

    const startIdleCheck = () => {
      idleTimerRef.current = setTimeout(() => {
        const idleTime = Date.now() - lastActivityRef.current
        if (idleTime >= 10000) { // 10 seconds of inactivity
          setIsIdle(true) // Visual-only: dim the overlay
          // Don't exit focus mode or pause timer
        }
      }, 10000)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer)
    })

    resetIdleTimer()
    startIdleCheck()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer)
      })
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [focusMode, timerState.isRunning])

  const handleTimerComplete = async () => {
    try {
      const audio = new Audio('/notification.mp3')
      await audio.play()
    } catch (e) {
      console.log('Could not play notification sound')
    }

    if (timerState.type === 'study') {
      setShowTitlePrompt(true)
    } else {
      await completeSession()
    }
  }

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
        toast.success('Session completed!')

        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'SESSION_COMPLETED',
          })
        }

        setCurrentSession(null)
        setShowTitlePrompt(false)
        setTimerState(prev => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          remainingSeconds: studyDuration * 60,
          totalSeconds: studyDuration * 60,
          type: 'study',
        }))

        const shouldContinue = confirm('Start another session?')
        if (shouldContinue) {
          startTimer()
        }
      }
    } catch (error) {
      console.error('Error completing session:', error)
      toast.error('Failed to complete session')
    }
  }

  const startTimer = async () => {
    try {
      const duration = timerState.type === 'study' ? studyDuration : breakDuration

      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTaskId,
          title: timerState.type === 'study' ? sessionTitle : 'Break',
          duration_minutes: duration,
          type: timerState.type,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newSession = data.session as StudySession

        isMasterTab.current = true
        setCurrentSession(newSession)
        setTimerState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false,
          remainingSeconds: duration * 60,
          totalSeconds: duration * 60,
          startedAt: new Date(),
        }))

        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'SESSION_STARTED',
            data: { session: newSession },
          })
        }

        toast.success(`${timerState.type === 'study' ? 'Study' : 'Break'} session started!`)
      }
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    }
  }

  const pauseTimer = () => {
    setTimerState(prev => ({ ...prev, isPaused: true }))
  }

  const resumeTimer = () => {
    setTimerState(prev => ({ ...prev, isPaused: false }))
  }

  const resetTimer = () => {
    if (currentSession) {
      fetch(`/api/study-sessions/${currentSession.id}`, {
        method: 'DELETE',
      }).catch(console.error)
    }

    setCurrentSession(null)
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      remainingSeconds: prev.totalSeconds,
      startedAt: null,
    }))
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

  const getProgressPercentage = () => {
    return ((timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activePage="focus" user={user} userProfile={userProfile} />

      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Centered Timer Layout */}
          <div className="text-center">
            {/* Timer Display */}
            <div className="mb-8">
              <div
                className="text-8xl font-bold tracking-tight"
                style={{ fontFamily: 'monospace' }}
              >
                {formatTime(timerState.remainingSeconds)}
              </div>

              {/* Refined Linear Progress Bar with Subtle Tick */}
              <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto mt-6">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Timer Type Badge */}
              <div className="mt-6">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    timerState.type === 'study'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-green-500/10 text-green-500'
                  }`}
                >
                  {timerState.type === 'study' ? 'Study' : 'Break'} Session
                </span>
              </div>

              {/* Inline Task Dropdown (Contextual Visibility) */}
              <div className="mt-6 flex justify-center">
                <TimerTaskDropdown
                  tasks={tasks}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                />
              </div>
            </div>

            {/* Single Primary Action Button */}
            <div className="flex items-center justify-center gap-4">
              {!timerState.isRunning ? (
                <Button size="lg" onClick={startTimer} className="gap-2 px-12">
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
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Type Toggle */}
            {!timerState.isRunning && (
              <div className="mt-6">
                <Button variant="ghost" size="sm" onClick={toggleTimerType}>
                  Switch to {timerState.type === 'study' ? 'Break' : 'Study'} Timer
                </Button>
              </div>
            )}

            {/* Icon-Only Settings Menu */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <TimerSettingsMenu
                studyDuration={studyDuration}
                breakDuration={breakDuration}
                onDurationChange={handleDurationChange}
                presets={DURATION_PRESETS}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFocusMode(!focusMode)}
                      className="h-9 w-9"
                    >
                      <span className="text-lg">🎯</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Focus mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/stats">
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View stats</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </main>

      {/* Focus Mode Overlay */}
      {focusMode && (
        <div
          className={`fixed inset-0 bg-background z-50 flex items-center justify-center transition-opacity duration-300 ${
            isIdle ? 'opacity-30' : 'opacity-100'
          }`}
        >
          <div className="text-center">
            <div
              className="text-9xl font-bold tracking-tight mb-8"
              style={{ fontFamily: 'monospace' }}
            >
              {formatTime(timerState.remainingSeconds)}
            </div>

            <div className="flex items-center justify-center gap-4">
              {timerState.isRunning && (
                <Button
                  size="lg"
                  onClick={timerState.isPaused ? resumeTimer : pauseTimer}
                  variant="outline"
                  className="gap-2"
                >
                  {timerState.isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
              )}
              <Button
                size="lg"
                onClick={() => setFocusMode(false)}
                variant="outline"
                className="gap-2"
              >
                <X className="h-5 w-5" />
                Exit
              </Button>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Press any key or move mouse to keep focus mode active
            </p>
          </div>
        </div>
      )}

      {/* Session Title Prompt */}
      {showTitlePrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Session Complete! 🎉</h2>
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
    </div>
  )
}
