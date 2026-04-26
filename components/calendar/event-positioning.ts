import type { EventsRow } from '@/lib/types'

// Configuration
export const TIME_GRID_CONFIG = {
  HOUR_HEIGHT: 60, // pixels per hour
  DAY_START_HOUR: 6, // 6 AM
  DAY_END_HOUR: 22, // 10 PM (22:00)
} as const

/**
 * Convert a time to pixel position in the time grid
 * @param time - The date/time to convert
 * @param hourHeight - Pixels per hour (default: 60)
 * @returns Pixel position from top of grid
 */
export function timeToPixels(time: Date, hourHeight: number = TIME_GRID_CONFIG.HOUR_HEIGHT): number {
  const hours = time.getHours() + time.getMinutes() / 60
  return hours * hourHeight
}

/**
 * Convert duration in minutes to pixel height
 * @param minutes - Duration in minutes
 * @param hourHeight - Pixels per hour (default: 60)
 * @returns Height in pixels
 */
export function durationToHeight(minutes: number, hourHeight: number = TIME_GRID_CONFIG.HOUR_HEIGHT): number {
  return (minutes / 60) * hourHeight
}

/**
 * Convert pixel position to time (hour and minute)
 * @param pixels - Pixel position from top
 * @param baseDate - Base date to set time on
 * @param hourHeight - Pixels per hour (default: 60)
 * @returns Date with calculated time
 */
export function pixelsToTime(pixels: number, baseDate: Date, hourHeight: number = TIME_GRID_CONFIG.HOUR_HEIGHT): Date {
  const totalHours = pixels / hourHeight
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)

  const newDate = new Date(baseDate)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

/**
 * Check if two events overlap in time
 * @param a - First event
 * @param b - Second event
 * @returns true if events overlap
 */
export function eventsOverlap(a: EventsRow, b: EventsRow): boolean {
  const aStart = new Date(a.event_date).getTime()
  const aEnd = new Date(a.end_time).getTime()
  const bStart = new Date(b.event_date).getTime()
  const bEnd = new Date(b.end_time).getTime()

  return aStart < bEnd && aEnd > bStart
}

/**
 * Find all groups of overlapping events
 * @param events - Array of events (should be pre-sorted by start time)
 * @returns Array of event groups, where each group contains overlapping events
 */
export function findOverlappingEventGroups(events: EventsRow[]): EventsRow[][] {
  if (events.length === 0) return []

  // Sort by start time
  const sorted = [...events].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )

  const groups: EventsRow[][] = []
  let currentGroup: EventsRow[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i]
    const eventStart = new Date(event.event_date).getTime()
    const eventEnd = new Date(event.end_time).getTime()

    // Check if this event overlaps with any event in the current group
    let overlapsWithGroup = false
    for (const groupEvent of currentGroup) {
      const groupStart = new Date(groupEvent.event_date).getTime()
      const groupEnd = new Date(groupEvent.end_time).getTime()

      if (eventStart < groupEnd && eventEnd > groupStart) {
        overlapsWithGroup = true
        break
      }
    }

    if (overlapsWithGroup) {
      currentGroup.push(event)
    } else {
      groups.push(currentGroup)
      currentGroup = [event] as any
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

/**
 * Calculate layout for overlapping events using a column-packing algorithm
 * Events that don't overlap share a column, overlapping events get new columns
 * @param events - Array of events
 * @param containerWidth - Width of the container in pixels
 * @returns Array of events with their layout information
 */
export interface EventLayout {
  event: EventsRow
  column: number
  totalColumns: number
  left: number
  width: number
}

export function calculateEventLayout(
  events: EventsRow[],
  containerWidth: number
): EventLayout[] {
  if (events.length === 0) return []

  // Sort by start time
  const sorted = [...events].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )

  // Track columns - each column contains non-overlapping events
  const columns: EventsRow[][] = []
  const layout: EventLayout[] = []

  for (const event of sorted) {
    let placed = false

    // Try to place in existing column
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i]
      const lastEvent = column[column.length - 1]

      // Check if event can fit after the last event in this column
      const lastEventEnd = new Date(lastEvent.end_time).getTime()
      const eventStart = new Date(event.event_date).getTime()

      if (eventStart >= lastEventEnd) {
        column.push(event)
        layout.push({
          event,
          column: i,
          totalColumns: columns.length,
          left: (i / columns.length) * containerWidth,
          width: containerWidth / columns.length,
        })
        placed = true
        break
      }
    }

    // If couldn't place in existing column, create new one
    if (!placed) {
      columns.push([event])
      const newColumnIndex = columns.length - 1
      const newTotalColumns = columns.length

      // Recalculate layout for all events (since column count changed)
      layout.length = 0 // Clear array
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        for (const colEvent of columns[colIdx]) {
          layout.push({
            event: colEvent,
            column: colIdx,
            totalColumns: newTotalColumns,
            left: (colIdx / newTotalColumns) * containerWidth,
            width: containerWidth / newTotalColumns,
          })
        }
      }
    }
  }

  return layout
}

/**
 * Calculate position and size for a single event in the time grid
 * @param event - The event to position
 * @param hourHeight - Pixels per hour (default: 60)
 * @returns Position and size info
 */
export interface EventPosition {
  top: number
  height: number
  startHour: number
  durationHours: number
}

export function calculateEventPosition(
  event: EventsRow,
  hourHeight: number = TIME_GRID_CONFIG.HOUR_HEIGHT
): EventPosition {
  const startDate = new Date(event.event_date)
  const endDate = new Date(event.end_time)

  const startHour = startDate.getHours() + startDate.getMinutes() / 60
  const endHour = endDate.getHours() + endDate.getMinutes() / 60
  const durationHours = endHour - startHour

  return {
    top: startHour * hourHeight,
    height: durationHours * hourHeight,
    startHour,
    durationHours,
  }
}

/**
 * Snap a time to the nearest 15-minute increment
 * @param date - The date/time to snap
 * @returns Date snapped to nearest 15 minutes
 */
export function snapTo15Minutes(date: Date): Date {
  const minutes = date.getMinutes()
  const roundedMinutes = Math.round(minutes / 15) * 15

  const newDate = new Date(date)
  newDate.setMinutes(roundedMinutes, 0, 0)
  return newDate
}

/**
 * Format time in 24-hour format (HH:MM)
 * @param date - The date/time to format
 * @returns Formatted time string
 */
export function formatTime24Hour(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Parse a time string in HH:MM format to a Date
 * @param timeStr - Time string in HH:MM format
 * @param baseDate - Base date to set time on
 * @returns Date with the parsed time
 */
export function parseTime24Hour(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)

  const newDate = new Date(baseDate)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

/**
 * Calculate duration between two dates in minutes
 * @param start - Start date/time
 * @param end - End date/time
 * @returns Duration in minutes
 */
export function calculateDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

/**
 * Format duration in human-readable format (e.g., "1h 30m")
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}m`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}
