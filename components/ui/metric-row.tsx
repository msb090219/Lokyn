import { cn } from '@/lib/utils'

interface MetricRowProps {
  label: string
  value: string
  className?: string
}

export function MetricRow({ label, value, className }: MetricRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-primary">{value}</span>
    </div>
  )
}
