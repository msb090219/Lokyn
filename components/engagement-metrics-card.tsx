import { Card } from '@/components/ui/card'
import { Metric } from '@/components/ui/metric'

interface EngagementMetricsCardProps {
  currentStreak: number
  bestStreak: number
  totalSessions: number
  className?: string
}

export function EngagementMetricsCard({
  currentStreak,
  bestStreak,
  totalSessions,
  className
}: EngagementMetricsCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Metric value={currentStreak} label="Day Streak" />
        <Metric value={bestStreak} label="Best Streak" />
        <Metric value={totalSessions} label="Total Sessions" />
      </div>
    </Card>
  )
}
