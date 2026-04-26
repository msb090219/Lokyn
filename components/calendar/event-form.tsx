'use client'

import { useState, useEffect } from 'react'
import type { EventColor } from '@/lib/types'
import { formatTime24Hour, parseTime24Hour, calculateDurationMinutes, formatDuration, snapTo15Minutes } from './event-positioning'

interface EventFormProps {
  // Event data (null for new events)
  title: string
  date: Date
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isAllDay: boolean
  color: EventColor
  description: string
  // Callbacks
  onTitleChange: (title: string) => void
  onDateChange: (date: Date) => void
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  onAllDayChange: (isAllDay: boolean) => void
  onColorChange: (color: EventColor) => void
  onDescriptionChange: (description: string) => void
}

const AVAILABLE_COLORS: EventColor[] = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink']

const colorDisplayMap: Record<EventColor, { bg: string; hover: string }> = {
  blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  red: { bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  green: { bg: 'bg-green-500', hover: 'hover:bg-green-600' },
  yellow: { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
  orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  pink: { bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
}

/**
 * Event form component with start/end time inputs
 * - Separate inputs for start and end time (24-hour format)
 * - Auto-calculates and displays duration
 * - All-day checkbox disables time inputs
 * - Color picker with 7 color options
 * - Optional description field
 */
export function EventForm({
  title,
  date,
  startTime,
  endTime,
  isAllDay,
  color,
  description,
  onTitleChange,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onAllDayChange,
  onColorChange,
  onDescriptionChange,
}: EventFormProps) {
  // Calculate duration for display
  const [durationText, setDurationText] = useState<string>('')

  useEffect(() => {
    if (isAllDay) {
      setDurationText('All day')
    } else if (startTime && endTime) {
      try {
        const start = parseTime24Hour(startTime, date)
        const end = parseTime24Hour(endTime, date)

        // Handle case where end time is before start time (next day)
        if (end < start) {
          end.setDate(end.getDate() + 1)
        }

        const duration = calculateDurationMinutes(start, end)
        setDurationText(formatDuration(duration))
      } catch {
        setDurationText('')
      }
    } else {
      setDurationText('')
    }
  }, [startTime, endTime, isAllDay, date])

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Handle color selection
  const handleColorSelect = (selectedColor: EventColor) => {
    onColorChange(selectedColor)
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          placeholder="Event title"
          autoFocus
        />
      </div>

      {/* Date Display */}
      <div>
        <label className="block text-sm font-medium mb-2">Date</label>
        <div className="w-full px-3 py-2 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">
          {formatDateDisplay(date)}
        </div>
      </div>

      {/* All Day Checkbox */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="all-day"
          checked={isAllDay}
          onChange={(e) => onAllDayChange(e.target.checked)}
          className="rounded border-input"
        />
        <label htmlFor="all-day" className="text-sm font-medium cursor-pointer">
          All day
        </label>
      </div>

      {/* Time Inputs */}
      {!isAllDay && (
        <div className="grid grid-cols-2 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{2}:[0-9]{2}"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              placeholder="09:00"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [text-align:inherit]"
            />
            <p className="text-xs text-muted-foreground mt-1">24-hour format (HH:MM)</p>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-2">End Time</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{2}:[0-9]{2}"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              placeholder="10:30"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent [text-align:inherit]"
            />
            <p className="text-xs text-muted-foreground mt-1">24-hour format (HH:MM)</p>
          </div>
        </div>
      )}

      {/* Duration Display */}
      {!isAllDay && durationText && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md">
          <span className="text-sm text-muted-foreground">Duration:</span>
          <span className="text-sm font-medium">{durationText}</span>
        </div>
      )}

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_COLORS.map((colorOption) => {
            const colors = colorDisplayMap[colorOption]
            const isSelected = color === colorOption

            return (
              <button
                key={colorOption}
                type="button"
                onClick={() => handleColorSelect(colorOption)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `${colors.bg} border-foreground scale-110 ring-2 ring-ring ring-offset-2`
                    : `${colors.bg} border-transparent opacity-60 hover:opacity-100 ${colors.hover}`
                }`}
                aria-label={`Select ${colorOption} color`}
                title={colorOption.charAt(0).toUpperCase() + colorOption.slice(1)}
              />
            )
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          placeholder="Add description..."
          rows={3}
        />
      </div>
    </div>
  )
}
