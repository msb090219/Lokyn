'use client'

import { Download } from 'lucide-react'
import type { EventsRow, EventVariant, EventColor } from '@/lib/types'
import { formatTime24Hour, calculateDurationMinutes, formatDuration } from './event-positioning'

interface EventCardProps {
  event: EventsRow
  variant?: EventVariant
  importGroupName?: string | null
  style?: React.CSSProperties
  onClick?: () => void
}

// Color mapping for borders and backgrounds
const colorMap: Record<EventColor, { border: string; bg: string; dot: string }> = {
  blue: { border: 'border-l-blue-500', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  red: { border: 'border-l-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  green: { border: 'border-l-green-500', bg: 'bg-green-500/10', dot: 'bg-green-500' },
  yellow: { border: 'border-l-yellow-500', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-500/10', dot: 'bg-purple-500' },
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-500' },
  pink: { border: 'border-l-pink-500', bg: 'bg-pink-500/10', dot: 'bg-pink-500' },
}

/**
 * Unified event card component with variants for different views
 * - compact: For time grid views (shows time range)
 * - full: For modal/detail views (shows all info)
 * - month: For month view (minimal inline card)
 */
export function EventCard({
  event,
  variant = 'compact',
  importGroupName,
  style,
  onClick,
}: EventCardProps) {
  const startDate = new Date(event.event_date)
  const endDate = new Date(event.end_time)
  const isAllDay = event.all_day === true || (startDate.getHours() === 0 && startDate.getMinutes() === 0)
  const isImported = event.import_batch_id !== null
  const color = (event.color || 'blue') as EventColor
  const colors = colorMap[color]

  // Calculate duration
  const duration = isAllDay ? null : calculateDurationMinutes(startDate, endDate)
  const durationText = duration ? formatDuration(duration) : null

  const baseClasses = "transition-colors cursor-pointer"
  const borderClass = isImported ? 'border-dashed' : 'border-solid'

  if (variant === 'compact') {
    // Compact variant for time grid views
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} ${colors.border} ${borderClass} border-l-4 ${colors.bg} rounded-r-md p-2 overflow-hidden`}
        style={style}
      >
        <div className="flex items-start gap-2">
          {/* Time column */}
          <div className="flex-shrink-0 text-xs font-medium tabular-ns text-foreground/80 min-w-[85px]">
            {isAllDay ? (
              <span>All day</span>
            ) : (
              <span>{formatTime24Hour(startDate)} - {formatTime24Hour(endDate)}</span>
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="text-sm font-medium truncate" title={event.title}>
              {event.title}
            </div>

            {/* Duration */}
            {durationText && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {durationText}
              </div>
            )}

            {/* Import indicator */}
            {isImported && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                <Download className="h-2.5 w-2.5" />
                <span className="truncate">{importGroupName || event.import_file_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'month') {
    // Month variant - minimal inline card
    return (
      <div
        onClick={onClick}
        className={`${baseClasses} flex items-center gap-1 px-1.5 py-0.5 ${colors.bg} border ${colors.border} ${borderClass} border-l-2 rounded hover:bg-primary hover:text-primary-foreground truncate`}
        style={style}
        title={`${event.title}${durationText ? ` (${durationText})` : ''}${isImported ? ` • ${importGroupName || event.import_file_name}` : ''}`}
      >
        {/* Colored dot */}
        <div className={`w-1 h-1 rounded-full flex-shrink-0 ${colors.dot}`} />

        {/* Title */}
        <span className="text-xs truncate flex-1">{event.title}</span>

        {/* Import indicator icon */}
        {isImported && (
          <Download className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0" />
        )}
      </div>
    )
  }

  // Full variant for modals and detail views
  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${colors.border} ${borderClass} border-l-4 ${colors.bg} rounded-lg p-3`}
      style={style}
    >
      <div className="flex items-start gap-3">
        {/* Colored indicator */}
        <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="text-sm font-semibold mb-1">{event.title}</div>

          {/* Time */}
          <div className="text-xs text-muted-foreground mb-1">
            {isAllDay ? (
              'All day'
            ) : (
              <>
                {formatTime24Hour(startDate)} - {formatTime24Hour(endDate)}
                {durationText && <> • {durationText}</>}
              </>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {event.description}
            </div>
          )}

          {/* Import indicator */}
          {isImported && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
              <Download className="h-3 w-3" />
              <span>Imported{importGroupName && ` from "${importGroupName}"`}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
