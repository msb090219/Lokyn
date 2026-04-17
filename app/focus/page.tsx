'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Pause, RotateCcw, Calendar, Settings, CheckCircle, BarChart3, Timer, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

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
  const { theme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Timer state
  const [timerState, setTimerState] = useState({
    isRunning: false,
    isPaused: false,
    remainingSeconds: 25 * 60, // Default 25 minutes
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
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [showDurationSettings, setShowDurationSettings] = useState(false)

  // Idle detection
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef(Date.now())

  // BroadcastChannel for cross-tab communication
  const channelRef = useRef<BroadcastChannel | null>(null)

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

            // Calculate remaining time
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
            // Another tab started a session, we become slave
            if (!currentSession && data.session) {
              setCurrentSession(data.session)
              setTimerState(prev => ({
                ...prev,
                isRunning: false, // Slave tab doesn't run timer
              }))
              toast.info('Session started in another tab')
            }
            break

          case 'SESSION_COMPLETED':
            // Session completed in another tab
            setCurrentSession(null)
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              isPaused: false,
              remainingSeconds: studyDuration * 60,
            }))
            break

          case 'TIMER_TICK':
            // Receive timer updates from master tab
            if (channelRef.current?.name !== 'master') {
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
          // Timer completed
          handleTimerComplete()
          return { ...prev, isRunning: false }
        }

        const newRemaining = prev.remainingSeconds - 1

        // Broadcast tick to other tabs
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

  // Idle detection for focus mode
  useEffect(() => {
    if (!focusMode || !timerState.isRunning) return

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now()
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }

    const startIdleCheck = () => {
      idleTimerRef.current = setTimeout(() => {
        const idleTime = Date.now() - lastActivityRef.current
        if (idleTime >= 10000) { // 10 seconds of inactivity
          setFocusMode(false)
          toast.info('Focus mode exited due to inactivity')
        }
      }, 10000)
    }

    // Track user activity
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
    // Play notification sound
    try {
      const audio = new Audio('/notification.mp3')
      await audio.play()
    } catch (e) {
      console.log('Could not play notification sound')
    }

    // Show completion prompt
    if (timerState.type === 'study') {
      setShowTitlePrompt(true)
    } else {
      // Break completed, just save
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

        // Broadcast completion to other tabs
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'SESSION_COMPLETED',
          })
        }

        // Reset state
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

        // Ask if user wants to continue
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

        setCurrentSession(newSession)
        setTimerState(prev => ({
          ...prev,
          isRunning: true,
          isPaused: false,
          remainingSeconds: duration * 60,
          totalSeconds: duration * 60,
          startedAt: new Date(),
        }))

        // Broadcast session start to other tabs
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
      // Delete the incomplete session
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    return ((timerState.totalSeconds - timerState.remainingSeconds) / timerState.totalSeconds) * 100
  }

  const applyPreset = (preset: typeof DURATION_PRESETS[0]) => {
    setStudyDuration(preset.study)
    setBreakDuration(preset.break)
    setTimerState(prev => ({
      ...prev,
      remainingSeconds: prev.type === 'study' ? preset.study * 60 : preset.break * 60,
      totalSeconds: prev.type === 'study' ? preset.study * 60 : preset.break * 60,
    }))

    // Save to user preferences
    const supabase = createClient()
    supabase
      .from('user_preferences')
      .update({
        study_duration: preset.study,
        break_duration: preset.break,
      })
      .eq('user_id', user.id)
      .then()

    toast.success(`Timer set to ${preset.label}`)
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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Focus</h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Tasks
                </Button>
              </Link>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </Button>
              </Link>
              <Link href="/stats">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Stats
                </Button>
              </Link>
            </nav>

            <Link href="/settings">
              <Button variant="ghost" size="sm" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 ${focusMode ? 'blur-sm transition-all duration-200' : ''}`}>
        <div className="max-w-2xl mx-auto">
          {/* Session Context */}
          {selectedTaskId && (
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Studying: <span className="font-medium text-foreground">{tasks.find(t => t.id === selectedTaskId)?.text}</span>
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setSelectedTaskId(null)}
              >
                Change task
              </Button>
            </div>
          )}

          {/* Timer Display */}
          <div className="bg-card rounded-2xl border border-border p-12 mb-6 shadow-sm">
            <div className="text-center">
              {/* Timer Type Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  timerState.type === 'study'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-green-500/10 text-green-500'
                }`}>
                  {timerState.type === 'study' ? 'Study' : 'Break'} Session
                </span>
              </div>

              {/* Time Display */}
              <div className="mb-8">
                <div className="text-8xl font-bold tracking-tight mb-4" style={{
                  fontFamily: 'monospace',
                }}>
                  {formatTime(timerState.remainingSeconds)}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                {!timerState.isRunning ? (
                  <Button
                    size="lg"
                    onClick={startTimer}
                    className="gap-2 px-8"
                  >
                    <Play className="h-5 w-5" />
                    Start
                  </Button>
                ) : (
                  <>
                    {timerState.isPaused ? (
                      <Button
                        size="lg"
                        onClick={resumeTimer}
                        className="gap-2 px-8"
                      >
                        <Play className="h-5 w-5" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={pauseTimer}
                        className="gap-2 px-8"
                        variant="outline"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </Button>
                    )}
                    <Button
                      size="lg"
                      onClick={resetTimer}
                      variant="outline"
                      className="gap-2"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Type Toggle */}
              {!timerState.isRunning && (
                <div className="mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTimerType}
                  >
                    Switch to {timerState.type === 'study' ? 'Break' : 'Study'} Timer
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTaskSelector(!showTaskSelector)}
            >
              Select Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDurationSettings(!showDurationSettings)}
            >
              Duration
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
            >
              Focus Mode
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/stats">View Stats</Link>
            </Button>
          </div>

          {/* Task Selector */}
          {showTaskSelector && (
            <div className="bg-card rounded-lg border border-border p-4 mb-6">
              <h3 className="font-semibold mb-3">Link to Task</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <Button
                  variant={selectedTaskId === null ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedTaskId(null)
                    setShowTaskSelector(false)
                  }}
                >
                  No task (just study)
                </Button>
                {tasks.map(task => (
                  <Button
                    key={task.id}
                    variant={selectedTaskId === task.id ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSelectedTaskId(task.id)
                      setShowTaskSelector(false)
                    }}
                  >
                    {task.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Duration Settings */}
          {showDurationSettings && (
            <div className="bg-card rounded-lg border border-border p-4 mb-6">
              <h3 className="font-semibold mb-3">Timer Duration</h3>

              {/* Presets */}
              <div className="flex gap-2 mb-4">
                {DURATION_PRESETS.map(preset => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Study (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={studyDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 25
                      setStudyDuration(val)
                      if (timerState.type === 'study' && !timerState.isRunning) {
                        setTimerState(prev => ({
                          ...prev,
                          remainingSeconds: val * 60,
                          totalSeconds: val * 60,
                        }))
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Break (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={breakDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5
                      setBreakDuration(val)
                      if (timerState.type === 'break' && !timerState.isRunning) {
                        setTimerState(prev => ({
                          ...prev,
                          remainingSeconds: val * 60,
                          totalSeconds: val * 60,
                        }))
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Micro Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{Math.floor(timerState.totalSeconds / 60)}m</p>
              <p className="text-sm text-muted-foreground">Session Length</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{timerState.type === 'study' ? '📚' : '☕'}</p>
              <p className="text-sm text-muted-foreground">
                {timerState.type === 'study' ? 'Focus Time' : 'Rest Time'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Focus Mode Overlay */}
      {focusMode && (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-9xl font-bold tracking-tight mb-8" style={{
              fontFamily: 'monospace',
            }}>
              {formatTime(timerState.remainingSeconds)}
            </div>

            {/* Minimal controls */}
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
                  completeSession() // Save with default title
                }
              }}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => completeSession()}
                className="flex-1"
              >
                Save & Finish
              </Button>
              <Button
                variant="outline"
                onClick={() => completeSession()}
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
