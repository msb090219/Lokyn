'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Settings, CheckCircle, BarChart3, Timer, Flame, Clock, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { StreakData, TimeMetricsData, HeatmapDataPoint, StudySessionsRow } from '@/lib/types'

interface StatsData {
  streak: StreakData
  timeMetrics: TimeMetricsData
  heatmap: HeatmapDataPoint[]
}

export default function StatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [sessions, setSessions] = useState<StudySessionsRow[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([])

  const heatmapContainerRef = useRef<HTMLDivElement>(null)

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

        // Load stats
        const statsResponse = await fetch('/api/study-stats')
        if (statsResponse.ok) {
          const data = await statsResponse.json()
          setStats(data)
          setHeatmapData(data.heatmap || [])
        }

        // Load recent sessions
        const sessionsResponse = await fetch('/api/study-sessions?limit=20')
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json()
          setSessions(sessionsData.sessions || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getHeatmapColor = (minutes: number) => {
    // Color scale: gray -> light blue -> medium blue -> dark blue -> navy
    if (minutes === 0) return 'hsl(0 0% 15%)' // No sessions
    if (minutes < 60) return 'hsl(var(--primary) / 0.25)' // 0-1 hours
    if (minutes < 120) return 'hsl(var(--primary) / 0.5)' // 1-2 hours
    if (minutes < 240) return 'hsl(var(--primary) / 0.75)' // 2-4 hours
    return 'hsl(var(--primary) / 1.0)' // 4+ hours
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥'
    if (streak >= 14) return '⚡'
    if (streak >= 7) return '✨'
    if (streak >= 3) return '💪'
    return '📚'
  }

  const renderHeatmap = () => {
    // Generate last 365 days
    const days: { date: Date; minutes: number; sessions: number }[] = []
    const today = new Date()

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dataPoint = heatmapData.find(d => {
        const dDate = new Date(d.study_date)
        dDate.setHours(0, 0, 0, 0)
        return dDate.getTime() === date.getTime()
      })

      days.push({
        date,
        minutes: dataPoint?.total_minutes || 0,
        sessions: dataPoint?.session_count || 0,
      })
    }

    // Group by weeks for GitHub-style layout
    const weeks: typeof days[] = []
    let currentWeek: typeof days = []

    days.forEach((day, index) => {
      currentWeek.push(day)
      if (currentWeek.length === 7 || index === days.length - 1) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Study Activity (Last 365 Days)
        </h3>

        <div
          ref={heatmapContainerRef}
          className="overflow-x-auto"
        >
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => {
                  const isToday = day.date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-pointer"
                      style={{
                        backgroundColor: getHeatmapColor(day.minutes),
                        border: isToday ? '2px solid var(--primary)' : 'none',
                      }}
                      title={`${day.date.toLocaleDateString()}: ${formatMinutes(day.minutes)} (${day.sessions} sessions)`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map(opacity => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    )
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
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Statistics</h1>
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
              <Link href="/focus">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Timer className="h-4 w-4" />
                  Focus
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Streak & Quick Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current Streak */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Flame className="h-8 w-8 text-orange-500" />
                  <span className="text-4xl">{getStreakEmoji(stats.streak.current_streak)}</span>
                </div>
                <div className="text-3xl font-bold mb-1">{stats.streak.current_streak}</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
                {stats.streak.current_streak > 0 && stats.streak.last_study_date && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Last studied: {formatDate(stats.streak.last_study_date)}
                  </div>
                )}
              </Card>

              {/* Best Streak */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 text-purple-500" />
                  <span className="text-4xl">🏆</span>
                </div>
                <div className="text-3xl font-bold mb-1">{stats.streak.best_streak}</div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
                {stats.streak.best_streak > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Personal record!
                  </div>
                )}
              </Card>

              {/* Total Sessions */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <span className="text-4xl">📊</span>
                </div>
                <div className="text-3xl font-bold mb-1">{stats.timeMetrics.total_sessions}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </Card>
            </div>
          )}

          {/* Time Metrics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Today</div>
                <div className="text-2xl font-bold text-primary">
                  {formatMinutes(stats.timeMetrics.today_minutes)}
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">This Week</div>
                <div className="text-2xl font-bold text-primary">
                  {formatMinutes(stats.timeMetrics.week_minutes)}
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Total Time</div>
                <div className="text-2xl font-bold text-primary">
                  {formatMinutes(stats.timeMetrics.total_minutes)}
                </div>
              </Card>
            </div>
          )}

          {/* Heatmap */}
          {renderHeatmap()}

          {/* Recent Sessions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Sessions
            </h3>

            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No study sessions yet</p>
                <p className="text-sm mt-2">
                  Start your first session in{' '}
                  <Link href="/focus" className="text-primary hover:underline">
                    Focus mode
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span>{formatDateTime(session.started_at)}</span>
                        <span className="text-primary">•</span>
                        <span>{formatMinutes(session.duration_minutes)}</span>
                        {session.type === 'break' && (
                          <>
                            <span className="text-primary">•</span>
                            <span className="text-green-500">Break</span>
                          </>
                        )}
                      </div>
                    </div>

                    {session.completed_at ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 text-sm font-medium">Completed</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ) : (
                      <div className="text-orange-500 text-sm font-medium">In Progress</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4">
            <Link href="/focus">
              <Button size="lg" className="gap-2">
                <Timer className="h-5 w-5" />
                Start Studying
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
