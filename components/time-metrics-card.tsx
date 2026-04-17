import { Card } from '@/components/ui/card'
import { MetricRow } from '@/components/ui/metric-row'

interface TimeMetricsCardProps {
  todayMinutes: number
  weekMinutes: number
  totalMinutes: number
  formatMinutes: (minutes: number) => string
  className?: string
}

export function TimeMetricsCard({
  todayMinutes,
  weekMinutes,
  totalMinutes,
  formatMinutes,
  className
}: TimeMetricsCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="font-semibold mb-4">Study Time</h3>
      <div className="space-y-2">
        <MetricRow label="Today" value={formatMinutes(todayMinutes)} />
        <MetricRow label="This Week" value={formatMinutes(weekMinutes)} />
        <MetricRow label="Total Time" value={formatMinutes(totalMinutes)} />
      </div>
    </Card>
  )
}
