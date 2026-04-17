import { cn } from '@/lib/utils'

interface MetricProps {
  value: string | number
  label: string
  className?: string
}

export function Metric({ value, label, className }: MetricProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
