import { formatTime24Hour } from './event-positioning'

interface TimeSlotLabelProps {
  hour: number
  height?: number
}

/**
 * Time slot label component for the time grid
 * Displays hour labels in 24-hour format (e.g., "09:00", "10:00")
 */
export function TimeSlotLabel({ hour, height = 60 }: TimeSlotLabelProps) {
  // Create a date for this hour
  const date = new Date()
  date.setHours(hour, 0, 0, 0)

  return (
    <div
      className="flex items-center justify-end pr-3 text-xs text-muted-foreground font-medium tabular-ns border-b border-border/50"
      style={{ height: `${height}px` }}
    >
      {formatTime24Hour(date)}
    </div>
  )
}
