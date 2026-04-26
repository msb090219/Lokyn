'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Timer, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { StreakData, TimeMetricsData, HeatmapDataPoint, StudySessionsRow } from '@/lib/types'
import { AppHeader } from '@/components/app-header'
import { EngagementMetricsCard } from '@/components/engagement-metrics-card'
import { TimeMetricsCard } from '@/components/time-metrics-card'
import { StudyHeatmap } from '@/components/study-heatmap'

interface StatsData {
  streak: StreakData
  timeMetrics: TimeMetricsData
  heatmap: HeatmapDataPoint[]
}

// Generate sample data for testing/development
const generateSampleData = (userId: string) => {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  // Sample streak data
  const streakData: StreakData = {
    current_streak: 12,
    best_streak: 30,
    last_study_date: yesterday.toISOString(),
    last_updated: now.toISOString()
  }

  // Sample time metrics
  const timeMetrics: TimeMetricsData = {
    today_minutes: 135, // 2h 15m
    week_minutes: 765, // 12h 45m
    total_minutes: 2910, // 48h 30m
    total_sessions: 156,
    last_updated: now.toISOString()
  }

  // Sample heatmap data (last 90 days with varied activity)
  const heatmapData: HeatmapDataPoint[] = []

  for (let i = 0; i < 90; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Realistic pattern: 40% chance of study, varying durations
    // Weekdays slightly more active than weekends
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const studyProbability = isWeekend ? 0.3 : 0.5

    if (Math.random() < studyProbability) {
      const baseMinutes = 25
      const randomExtra = Math.floor(Math.random() * 275) // 0-275 extra minutes
      const minutes = baseMinutes + randomExtra

      heatmapData.push({
        study_date: date.toISOString(),
        total_minutes: minutes,
        session_count: Math.ceil(minutes / 25)
      })
    }
  }

  // Sample recent sessions
  const sessionTitles = [
    'Calculus Chapter 3',
    'Physics Review - Mechanics',
    'Essay Writing - History',
    'Chemistry Problem Set',
    'Literature Reading',
    'Math Practice Problems',
    'Biology Notes Review',
    'Programming Project',
    'Statistics Homework',
    'Research Paper Writing',
    'Language Learning',
    'Study Group Session'
  ]

  const sessions: StudySessionsRow[] = []
  const sessionTypes: Array<'study' | 'break'> = ['study', 'study', 'study', 'study', 'break']

  for (let i = 0; i < 15; i++) {
    const hoursAgo = i * 2 + 1 // 1, 3, 5, 7... hours ago
    const startedAt = new Date(now)
    startedAt.setHours(startedAt.getHours() - hoursAgo)

    const duration = [25, 50, 75, 100][Math.floor(Math.random() * 4)]
    const completedAt = new Date(startedAt)
    completedAt.setMinutes(completedAt.getMinutes() + duration)

    sessions.push({
      id: `sample-${i}`,
      user_id: userId,
      task_id: null,
      title: sessionTitles[i % sessionTitles.length],
      duration_minutes: duration,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      type: sessionTypes[Math.floor(Math.random() * sessionTypes.length)],
      created_at: startedAt.toISOString(),
      updated_at: completedAt.toISOString()
    })
  }

  return {
    streak: streakData,
    timeMetrics,
    heatmap: heatmapData,
    sessions
  }
}

export default function StatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [sessions, setSessions] = useState<StudySessionsRow[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([])

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

        // Load profile, stats, and sessions in parallel
        const [profileResult, statsResult, sessionsResult] = await Promise.all([
          supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', authUser.id)
            .single(),
          fetch('/api/study-stats'),
          fetch('/api/study-sessions?limit=20')
        ])

        if (profileResult.data) {
          setUserProfile(profileResult.data)
        }

        if (statsResult.ok) {
          const data = await statsResult.json()
          setStats(data)
          setHeatmapData(data.heatmap || [])
        }

        if (sessionsResult.ok) {
          const sessionsData = await sessionsResult.json()
          setSessions(sessionsData.sessions || [])
        }

        // If no real data exists, use sample data for demonstration
        if (!stats || stats.timeMetrics.total_sessions === 0) {
          const sampleData = generateSampleData(authUser.id)
          setStats({
            streak: sampleData.streak,
            timeMetrics: sampleData.timeMetrics,
            heatmap: sampleData.heatmap
          })
          setHeatmapData(sampleData.heatmap)
          setSessions(sampleData.sessions)

          toast.info('Showing sample data for demonstration')
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
    if (minutes === 0) return 'hsl(0 0% 15%)'
    if (minutes < 60) return 'hsl(var(--primary) / 0.25)'
    if (minutes < 120) return 'hsl(var(--primary) / 0.5)'
    if (minutes < 240) return 'hsl(var(--primary) / 0.75)'
    return 'hsl(var(--primary) / 1.0)'
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader activePage="stats" user={user} userProfile={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* CARD 1: Engagement Metrics (Streak + Overview + Totals) */}
          {stats && (
            <EngagementMetricsCard
              currentStreak={stats.streak.current_streak}
              bestStreak={stats.streak.best_streak}
              totalSessions={stats.timeMetrics.total_sessions}
            />
          )}

          {/* CARD 2: Heatmap (Primary Visual Hero - Full Width) */}
          <StudyHeatmap
            data={heatmapData}
            getHeatmapColor={getHeatmapColor}
            formatMinutes={formatMinutes}
            formatDate={formatDate}
          />

          {/* CARD 3: Time Metrics */}
          {stats && (
            <TimeMetricsCard
              todayMinutes={stats.timeMetrics.today_minutes}
              weekMinutes={stats.timeMetrics.week_minutes}
              totalMinutes={stats.timeMetrics.total_minutes}
              formatMinutes={formatMinutes}
            />
          )}

          {/* CARD 4: Recent Sessions */}
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
                      <div className="text-body-sm text-muted-foreground flex items-center gap-2 mt-1">
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
