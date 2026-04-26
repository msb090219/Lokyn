'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import type { EventsRow } from '@/lib/types'
import { EventCard } from './event-card'
import { TimeSlotLabel } from './time-slot-label'
import {
  TIME_GRID_CONFIG,
  timeToPixels,
  durationToHeight,
  pixelsToTime,
  snapTo15Minutes,
  calculateEventLayout,
} from './event-positioning'

interface TimeGridDayViewProps {
  events: EventsRow[]
  date: Date
  importGroupNames?: Map<string, string> // batch_id -> name
  onDateClick: (time?: Date) => void
  onEventClick: (event: EventsRow) => void
}

/**
 * Time grid day view component
 * - Shows hours on the left (24-hour format)
 * - Events positioned vertically by duration
 * - Overlapping events displayed side-by-side with narrower width
 * - Click on time slot to create event at that time
 * - Responsive: shows 6 AM - 10 PM (16 hours)
 */
export function TimeGridDayView({
  events,
  date,
  importGroupNames,
  onDateClick,
  onEventClick,
}: TimeGridDayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)

  // Update container width on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth - 64) // Subtract time labels column width
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  // Filter events for this day
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.event_date)
      return eventDate.toDateString() === date.toDateString()
    })
  }, [events, date])

  // Calculate event layout
  const eventLayout = useMemo(() => {
    return calculateEventLayout(dayEvents, containerWidth)
  }, [dayEvents, containerWidth])

  // Generate hour labels (6 AM to 10 PM)
  const hours = useMemo(() => {
    const result: number[] = []
    for (let h = TIME_GRID_CONFIG.DAY_START_HOUR; h <= TIME_GRID_CONFIG.DAY_END_HOUR; h++) {
      result.push(h)
    }
    return result
  }, [])

  // Handle click on time slot
  const handleTimeSlotClick = (hour: number) => {
    const clickedDate = new Date(date)
    clickedDate.setHours(hour, 0, 0, 0)
    onDateClick(clickedDate)
  }

  // Get import group name for an event
  const getImportGroupName = (event: EventsRow): string | undefined => {
    if (!event.import_batch_id) return undefined
    return importGroupNames?.get(event.import_batch_id)
  }

  const totalHeight = (TIME_GRID_CONFIG.DAY_END_HOUR - TIME_GRID_CONFIG.DAY_START_HOUR + 1) * TIME_GRID_CONFIG.HOUR_HEIGHT

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Time Labels Column */}
        <div className="w-16 flex-shrink-0 bg-muted/30 border-r border-border">
          <div
            className="overflow-y-auto"
            style={{ height: totalHeight > 0 ? `${totalHeight}px` : '100%' }}
          >
            {hours.map((hour) => (
              <TimeSlotLabel key={hour} hour={hour} height={TIME_GRID_CONFIG.HOUR_HEIGHT} />
            ))}
          </div>
        </div>

        {/* Time Grid Column */}
        <div className="flex-1 overflow-y-auto relative">
          <div
            className="relative"
            style={{ minHeight: totalHeight > 0 ? `${totalHeight}px` : '100%' }}
          >
            {/* Hour Slots */}
            {hours.map((hour) => {
              const topPosition = (hour - TIME_GRID_CONFIG.DAY_START_HOUR) * TIME_GRID_CONFIG.HOUR_HEIGHT

              return (
                <div
                  key={hour}
                  onClick={() => handleTimeSlotClick(hour)}
                  className="absolute left-0 right-0 border-b border-border/50 hover:bg-accent/5 transition-colors cursor-pointer"
                  style={{
                    top: `${topPosition}px`,
                    height: `${TIME_GRID_CONFIG.HOUR_HEIGHT}px`,
                  }}
                  aria-label={`Create event at ${hour}:00`}
                />
              )
            })}

            {/* Current Time Indicator */}
            {date.toDateString() === new Date().toDateString() && (
              <CurrentTimeIndicator startHour={TIME_GRID_CONFIG.DAY_START_HOUR} />
            )}

            {/* Events */}
            {eventLayout.map(({ event, left, width }) => {
              const startDate = new Date(event.event_date)
              const endDate = new Date(event.end_time)

              // Calculate position relative to visible hours
              const startHour = startDate.getHours() + startDate.getMinutes() / 60
              const durationHours = (endDate.getTime() - startDate.getTime()) / 3600000

              const top = (startHour - TIME_GRID_CONFIG.DAY_START_HOUR) * TIME_GRID_CONFIG.HOUR_HEIGHT
              const height = durationHours * TIME_GRID_CONFIG.HOUR_HEIGHT

              // Don't render if outside visible range
              if (top + height < 0 || top > totalHeight) return null

              return (
                <div
                  key={event.id}
                  className="absolute overflow-hidden rounded-r-md"
                  style={{
                    left: `${left + 8}px`, // +8 for padding
                    width: `${Math.max(width - 16, 100)}px`, // -16 for padding, min 100px
                    top: `${Math.max(top, 0)}px`,
                    height: `${Math.min(height, totalHeight - Math.max(top, 0))}px`,
                  }}
                >
                  <EventCard
                    event={event}
                    variant="compact"
                    importGroupName={getImportGroupName(event)}
                    onClick={() => onEventClick(event)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CurrentTimeIndicatorProps {
  startHour: number
}

function CurrentTimeIndicator({ startHour }: CurrentTimeIndicatorProps) {
  const [top, setTop] = useState<number>(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
      setTop((hours - startHour) * TIME_GRID_CONFIG.HOUR_HEIGHT)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [startHour])

  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="w-16 flex-shrink-0 flex items-center justify-end pr-2">
        <div className="w-2 h-2 rounded-full bg-red-500" />
      </div>
      <div className="flex-1 h-px bg-red-500" />
    </div>
  )
}
