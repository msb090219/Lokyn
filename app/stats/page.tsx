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

export default function StatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

        // Load user profile
        const { data: profile } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        if (profile) {
          setUserProfile(profile)
        }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
