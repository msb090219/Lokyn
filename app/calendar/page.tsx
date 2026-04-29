'use client'

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight, Download, Upload, FileText, ChevronDown, Timer, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserProfileMenu from '@/components/user-profile-menu'
import { LokynLogo } from '@/components/lokyne-logo'
import { toast } from 'sonner'
import type { EventsRow, EventColor } from '@/lib/types'
import { EventCard } from '@/components/calendar/event-card'
import { EventForm } from '@/components/calendar/event-form'
import { TimeGridDayView } from '@/components/calendar/time-grid-day-view'
import { formatTime24Hour, parseTime24Hour, calculateDurationMinutes, snapTo15Minutes } from '@/components/calendar/event-positioning'

// ============================================================
// SHARED COMPONENTS
// ============================================================

// Day Header component
function DayHeader({
  date,
  isToday = false,
}: {
  date: Date
  isToday?: boolean
}) {
  return (
    <div className={`px-3 py-2.5 border-b ${isToday ? 'bg-primary/10 border-primary' : 'bg-muted/30 border-border'}`}>
      <div className="text-xs uppercase tracking-wide mb-0.5 opacity-70">
        {date.toLocaleDateString('en-US', { weekday: 'short' })}
      </div>
      <div className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}

// Helper function to get events for a date with sorting
function getSortedEventsForDate(events: EventsRow[], date: Date) {
  return events
    .filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate.toDateString() === date.toDateString()
    })
    .sort((a, b) => {
      // Helper function to check if event is all-day
      const isAllDayEvent = (event: EventsRow) => {
        return event.all_day === true || (new Date(event.event_date).getHours() === 0 && new Date(event.event_date).getMinutes() === 0)
      }

      const aIsAllDay = isAllDayEvent(a)
      const bIsAllDay = isAllDayEvent(b)

      // All-day events first
      if (aIsAllDay && !bIsAllDay) return -1
      if (!aIsAllDay && bIsAllDay) return 1

      // Then sort by time
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    })
}

// ============================================================
// DAY VIEW COMPONENT (Mobile - List View)
// ============================================================

const DayView = memo(function DayView({
  events,
  date,
  importGroupNames,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  date: Date
  importGroupNames?: Map<string, string>
  onDateClick: () => void
  onEventClick: (event: EventsRow) => void
}) {
  const dayEvents = getSortedEventsForDate(events, date)
  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className="border-b border-border">
        <DayHeader date={date} isToday={isToday} />
      </div>

      {/* Events list */}
      {dayEvents.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center px-3 py-6 text-sm text-muted-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer text-center min-h-[200px]"
          onClick={onDateClick}
        >
          <div className="flex flex-col items-center gap-2">
            <Plus className="h-5 w-5" />
            <span>No events</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {dayEvents.map((event) => {
            const importGroupName = event.import_batch_id ? importGroupNames?.get(event.import_batch_id) : undefined
            return (
              <EventCard
                key={event.id}
                event={event}
                variant="compact"
                importGroupName={importGroupName}
                onClick={() => onEventClick(event)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
})

// ============================================================
// WEEK VIEW COMPONENT (2x4 GRID)
// ============================================================

const WeekView = memo(function WeekView({
  events,
  currentCalendarDate,
  importGroupNames,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  currentCalendarDate: Date
  importGroupNames?: Map<string, string>
  onDateClick: (date: Date) => void
  onEventClick: (event: EventsRow) => void
}) {
  // Memoize week dates calculation
  const weekDates = useMemo(() => {
    const start = new Date(currentCalendarDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)

    const week = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      week.push(d)
    }
    return week
  }, [currentCalendarDate])

  const today = new Date()

  return (
    <div className="h-full overflow-y-auto">
      {/* Responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pb-2">
        {weekDates.map((date) => {
          const dayEvents = getSortedEventsForDate(events, date)
          const isToday = date.toDateString() === today.toDateString()

          return (
            <div
              key={date.toISOString()}
              className="min-h-[200px] bg-card border border-border rounded-lg overflow-hidden flex flex-col"
            >
              {/* Day header */}
              <DayHeader date={date} isToday={isToday} />

              {/* Events */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {dayEvents.length === 0 ? (
                  <div
                    className="h-full flex items-center justify-center px-2 py-6 text-xs text-muted-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer text-center min-h-[120px]"
                    onClick={() => onDateClick(date)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="h-4 w-4" />
                      <span>No events</span>
                    </div>
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const importGroupName = event.import_batch_id ? importGroupNames?.get(event.import_batch_id) : undefined
                    return (
                      <EventCard
                        key={event.id}
                        event={event}
                        variant="compact"
                        importGroupName={importGroupName}
                        onClick={() => onEventClick(event)}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ============================================================
// MONTH VIEW COMPONENT (Custom implementation)
// ============================================================

const MonthView = memo(function MonthView({
  events,
  currentCalendarDate,
  importGroupNames,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  currentCalendarDate: Date
  importGroupNames?: Map<string, string>
  onDateClick: (date: Date) => void
  onEventClick: (event: EventsRow) => void
}) {
  // Memoize month dates calculation
  const monthDates = useMemo(() => {
    const year = currentCalendarDate.getFullYear()
    const month = currentCalendarDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)

    // Get Monday of the week containing the first day
    const dayOfWeek = firstDay.getDay()
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday = 1
    const startDate = new Date(year, month, 1 + startOffset)

    // Get all dates (6 weeks to cover full month)
    const dates = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      dates.push(d)
    }

    return dates
  }, [currentCalendarDate])

  const today = new Date()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="h-full overflow-y-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day) => (
          <div key={day} className="text-xs font-medium text-center py-2 text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDates.map((date) => {
          const dayEvents = getSortedEventsForDate(events, date)
          const isToday = date.toDateString() === today.toDateString()
          const isCurrentMonth = date.getMonth() === currentCalendarDate.getMonth()

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[80px] bg-card border border-border p-2 rounded-md flex flex-col ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isToday ? 'border-primary shadow-sm' : ''}`}
            >
              {/* Day number */}
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                {date.getDate()}
              </div>

              {/* Events */}
              <div className="flex-1 space-y-1">
                {dayEvents.length === 0 ? (
                  <div
                    className="h-full min-h-[40px] flex items-center justify-center hover:bg-primary hover:text-primary-foreground rounded cursor-pointer"
                    onClick={() => onDateClick(date)}
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {dayEvents.slice(0, 3).map((event) => {
                      const importGroupName = event.import_batch_id ? importGroupNames?.get(event.import_batch_id) : undefined
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          variant="month"
                          importGroupName={importGroupName}
                          onClick={() => onEventClick(event)}
                        />
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-xs text-muted-foreground px-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground rounded"
                        onClick={() => onDateClick(date)}
                      >
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ============================================================
// MAIN CALENDAR PAGE
// ============================================================

export default function CalendarPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<EventsRow[]>([])
  const [importGroupNames, setImportGroupNames] = useState<Map<string, string>>(new Map())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventsRow | null>(null)

  // Form state with start/end times
  const [eventTitle, setEventTitle] = useState('')
  const [eventStartTime, setEventStartTime] = useState('09:00')
  const [eventEndTime, setEventEndTime] = useState('10:00')
  const [eventColor, setEventColor] = useState<EventColor>('blue')
  const [eventIsAllDay, setEventIsAllDay] = useState(false)
  const [eventDescription, setEventDescription] = useState('')

  const [currentView, setCurrentView] = useState<'listDay' | 'listWeek' | 'dayGridMonth'>('listDay')
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importGroupName, setImportGroupName] = useState('')
  const [importGroupColor, setImportGroupColor] = useState<EventColor>('blue')
  const [isImporting, setIsImporting] = useState(false)
  const [showManageImports, setShowManageImports] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [editingImportGroup, setEditingImportGroup] = useState<{batchId: string; name: string; color: EventColor} | null>(null)

  const lastLocalUpdate = useRef<number>(0)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  // Go to today
  const goToToday = () => {
    setCurrentCalendarDate(new Date())
  }

  // Load user data, events, and import groups
  const loadUserData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUser(session.user)

      // Load events, profile, and import groups in parallel
      const [eventsResult, profileResult, importGroupsResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('user_id', session.user.id)
          .order('event_date', { ascending: true }),
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single(),
        supabase
          .from('import_groups')
          .select('*')
          .eq('user_id', session.user.id)
      ])

      const { data: eventsData, error } = eventsResult
      const { data: profile } = profileResult
      const { data: importGroupsData } = importGroupsResult

      if (profile) {
        setUserProfile(profile)
      }

      if (error) {
        console.error('Error loading events:', JSON.stringify(error, null, 2))
        console.error('Error message:', error?.message || 'No message')
        console.error('Error details:', error?.details || 'No details')
        console.error('Error hint:', error?.hint || 'No hint')
        throw error
      }

      setEvents(eventsData || [])

      // Build import group names map
      if (importGroupsData) {
        const map = new Map<string, string>()
        importGroupsData.forEach((group: any) => {
          map.set(group.batch_id, group.name)
        })
        setImportGroupNames(map)
      }

      // Subscribe to real-time changes for events
      const channel = supabase
        .channel('calendar-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            // Ignore updates within 1 second of local changes
            if (Date.now() - lastLocalUpdate.current < 1000) return
            loadUserData() // Reload data on changes
          }
        )
        .subscribe()

      // Subscribe to import groups changes
      const groupsChannel = supabase
        .channel('import-groups-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'import_groups',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            if (Date.now() - lastLocalUpdate.current < 1000) return
            loadUserData()
          }
        )
        .subscribe()

      // Store channels in ref for cleanup
      const channelsRef = { current: [channel, groupsChannel] }
      ;(window as any).__calendarChannels = channelsRef
    } catch (error: any) {
      console.error('Error loading data:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message || 'No message')
      console.error('Error details:', error?.details || 'No details')
      console.error('Error hint:', error?.hint || 'No hint')
      toast.error(`Failed to load calendar: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadUserData()

    // Cleanup function to remove Supabase channels
    return () => {
      const channelsRef = (window as any).__calendarChannels
      if (channelsRef?.current) {
        const supabase = createClient()
        channelsRef.current.forEach((channel: any) => {
          supabase.removeChannel(channel)
        })
        delete (window as any).__calendarChannels
      }
    }
  }, [loadUserData])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    toast.success('Signed out successfully')
  }

  // Handle date click (optional time parameter for time grid clicks)
  const handleDateClick = (date: Date, time?: Date) => {
    let finalDate = new Date(date)
    if (time) {
      // If time provided, set the hours/minutes
      finalDate = new Date(date)
      finalDate.setHours(time.getHours(), time.getMinutes(), 0, 0)
    }
    setSelectedDate(finalDate)
    setShowDayModal(true)
  }

  // Open add event modal
  const openAddEventModal = (preselectedTime?: Date) => {
    setEditingEvent(null)
    setEventTitle('')
    setEventDescription('')

    if (preselectedTime) {
      // Set times based on clicked time slot
      const snappedTime = snapTo15Minutes(preselectedTime)
      setEventStartTime(formatTime24Hour(snappedTime))

      // Default to 1 hour duration
      const endTime = new Date(snappedTime)
      endTime.setMinutes(endTime.getMinutes() + 60)
      setEventEndTime(formatTime24Hour(endTime))
      setEventIsAllDay(false)
    } else {
      setEventStartTime('09:00')
      setEventEndTime('10:00')
      setEventIsAllDay(false)
    }

    setEventColor('blue')
    setShowEventModal(true)
  }

  // Open edit event modal
  const openEditEventModal = (event: EventsRow) => {
    setEditingEvent(event)
    setEventTitle(event.title)
    setEventDescription(event.description || '')

    const startDate = new Date(event.event_date)
    const endDate = new Date(event.end_time)

    // Check if it's an all-day event
    const isAllDayEvent = event.all_day === true ||
      (startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
       endDate.getHours() === 0 && endDate.getMinutes() === 0)

    setEventIsAllDay(isAllDayEvent)

    if (!isAllDayEvent) {
      setEventStartTime(formatTime24Hour(startDate))
      setEventEndTime(formatTime24Hour(endDate))
    } else {
      setEventStartTime('09:00')
      setEventEndTime('10:00')
    }

    setEventColor((event.color || 'blue') as EventColor)
    setShowEventModal(true)
  }

  // Save event
  const saveEvent = async () => {
    if (!eventTitle.trim()) {
      toast.error('Please enter an event title')
      return
    }

    if (!selectedDate) {
      toast.error('No date selected')
      return
    }

    const supabase = createClient()

    try {
      let eventDate: Date
      let endTime: Date

      if (eventIsAllDay) {
        // All-day event: start at midnight, end at midnight next day
        eventDate = new Date(selectedDate)
        eventDate.setHours(0, 0, 0, 0)

        endTime = new Date(eventDate)
        endTime.setDate(endTime.getDate() + 1)
      } else {
        // Parse start and end times
        eventDate = parseTime24Hour(eventStartTime, selectedDate)
        endTime = parseTime24Hour(eventEndTime, selectedDate)

        // Handle case where end time is before start time (next day)
        if (endTime < eventDate) {
          endTime.setDate(endTime.getDate() + 1)
        }

        // Validate end time is after start time
        if (endTime <= eventDate) {
          toast.error('End time must be after start time')
          return
        }
      }

      // Calculate duration in minutes
      const durationMinutes = Math.round((endTime.getTime() - eventDate.getTime()) / 60000)

      if (editingEvent) {
        // Update existing event
        lastLocalUpdate.current = Date.now()

        const eventData = {
          title: eventTitle.trim(),
          event_date: eventDate.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          color: eventColor,
          description: eventDescription || null,
          all_day: eventIsAllDay,
        }
        const { error } = await (supabase.from('events') as any)
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error

        toast.success('Event updated')
      } else {
        // Create new event
        lastLocalUpdate.current = Date.now()

        const { error } = await (supabase.from('events') as any)
          .insert({
            user_id: user.id,
            title: eventTitle.trim(),
            event_date: eventDate.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: durationMinutes,
            color: eventColor,
            description: eventDescription || null,
            all_day: eventIsAllDay,
          })

        if (error) throw error

        toast.success('Event created')
      }

      setShowEventModal(false)
      await loadUserData()
    } catch (error: any) {
      console.error('Error saving event:', error)
      toast.error(`Failed to save event: ${error?.message || 'Unknown error'}`)
    }
  }

  // Delete event
  const deleteEvent = async (eventId: string) => {
    const supabase = createClient()

    try {
      lastLocalUpdate.current = Date.now()

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast.success('Event deleted')
      setShowDayModal(false)
      setShowEventModal(false)
      await loadUserData()
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error(`Failed to delete event: ${error?.message || 'Unknown error'}`)
    }
  }

  // Get all imports grouped by batch
  const getImports = () => {
    const imports = new Map<string, { fileName: string; count: number; date: string; color?: string }>()

    events.forEach(event => {
      if (event.import_batch_id && event.import_file_name) {
        if (!imports.has(event.import_batch_id)) {
          const groupName = importGroupNames.get(event.import_batch_id)
          imports.set(event.import_batch_id, {
            fileName: groupName || event.import_file_name,
            count: 0,
            date: event.imported_at || event.created_at || new Date().toISOString(),
            color: event.color,
          })
        }
        const imp = imports.get(event.import_batch_id)!
        imp.count++
      }
    })

    return Array.from(imports.entries()).map(([batchId, data]) => ({
      batchId,
      ...data,
    }))
  }

  // Delete an import batch
  const deleteImportBatch = async (batchId: string, fileName: string) => {
    const supabase = createClient()

    try {
      lastLocalUpdate.current = Date.now()

      // Delete events
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', user.id)
        .eq('import_batch_id', batchId)

      if (eventsError) throw eventsError

      // Delete import group
      const { error: groupError } = await supabase
        .from('import_groups')
        .delete()
        .eq('batch_id', batchId)

      if (groupError) {
        console.error('Error deleting import group:', groupError)
        // Don't throw, events are already deleted
      }

      toast.success(`Deleted "${fileName}"`)
      await loadUserData()
    } catch (error: any) {
      console.error('Error deleting import batch:', error)
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`)
    }
  }

  // Update import group
  const updateImportGroup = async () => {
    if (!editingImportGroup) return

    const supabase = createClient()

    try {
      lastLocalUpdate.current = Date.now()

      const { error } = await (supabase.from('import_groups') as any)
        .update({
          name: editingImportGroup.name,
          color: editingImportGroup.color,
        })
        .eq('batch_id', editingImportGroup.batchId)

      if (error) throw error

      toast.success('Import group updated')
      setEditingImportGroup(null)
      await loadUserData()
    } catch (error: any) {
      console.error('Error updating import group:', error)
      toast.error(`Failed to update: ${error?.message || 'Unknown error'}`)
    }
  }

  // Navigate to previous/next
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentCalendarDate)

    if (currentView === 'listDay') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (currentView === 'listWeek') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }

    setCurrentCalendarDate(newDate)
  }

  // Parse ICS date format
  const parseICSDate = (dateStr: string): Date => {
    const cleanStr = dateStr.replace(/[^0-9]/g, '')
    const isUTC = dateStr.trim().endsWith('Z')

    if (cleanStr.length >= 14) {
      const year = parseInt(cleanStr.substring(0, 4))
      const month = parseInt(cleanStr.substring(4, 6)) - 1
      const day = parseInt(cleanStr.substring(6, 8))
      const hour = parseInt(cleanStr.substring(8, 10))
      const minute = parseInt(cleanStr.substring(10, 12))
      const second = parseInt(cleanStr.substring(12, 14))

      if (isUTC) {
        return new Date(Date.UTC(year, month, day, hour, minute, second))
      } else {
        return new Date(year, month, day, hour, minute, second)
      }
    }

    return new Date()
  }

  // Export calendar to .ics file
  const exportCalendar = async () => {
    try {
      let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lokyn//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Student Calendar
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Student Calendar Events
`

      events.forEach(event => {
        const startDate = new Date(event.event_date)
        const endDate = new Date(event.end_time)

        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        }

        icsContent += `BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
DTSTAMP:${formatDate(new Date(event.created_at))}
UID:${event.id}@studentdashboard
SUMMARY:${event.title.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')}
DESCRIPTION:${event.description?.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,') || ''}
END:VEVENT
`
      })

      icsContent += `END:VCALENDAR`

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const fileName = `calendar-export-${new Date().toISOString().split('T')[0]}.ics`

      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${events.length} events`)
    } catch (error: any) {
      console.error('Error exporting calendar:', error)
      toast.error(`Failed to export: ${error?.message || 'Unknown error'}`)
    }
  }

  // Import calendar from .ics file
  const importCalendar = async () => {
    if (!importFile) {
      toast.error('Please select a file')
      return
    }

    if (!importFile.name.endsWith('.ics')) {
      toast.error('Please select an .ics file')
      return
    }

    setIsImporting(true)

    try {
      const supabase = createClient()

      let text: string = ''
      try {
        text = await importFile.text()
      } catch (readError) {
        console.error('Error reading file:', readError)
        toast.error('Failed to read file. Please try a different file.')
        setIsImporting(false)
        return
      }

      if (!text || text.trim().length === 0) {
        toast.error('File is empty')
        setIsImporting(false)
        return
      }

      // Handle line folding
      const unfoldLines = (lines: string[]): string[] => {
        const result: string[] = []
        for (const line of lines) {
          if (line.startsWith(' ') || line.startsWith('\t')) {
            if (result.length > 0) {
              result[result.length - 1] += line.substring(1)
            }
          } else {
            result.push(line)
          }
        }
        return result
      }

      // Parse ICS file
      const lines = unfoldLines(text.split('\n'))
      const importedEvents: any[] = []
      let currentEvent: any = null
      let inEvent = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        try {
          if (line === 'BEGIN:VEVENT') {
            inEvent = true
            currentEvent = {}
          } else if (line === 'END:VEVENT') {
            if (currentEvent && currentEvent.title && currentEvent.start) {
              importedEvents.push(currentEvent)
            }
            inEvent = false
            currentEvent = null
          } else if (inEvent && currentEvent) {
            if (line.startsWith('SUMMARY:')) {
              const summaryText = line.substring(8) || ''
              let processed = summaryText
                .replace(/\\,/g, ',')
                .replace(/\\;/g, ';')
                .replace(/\\n/g, '\n')
                .replace(/\\N/g, '\n')
                .replace(/\\\\/g, '\\')
              currentEvent.title = processed
            } else if (line.startsWith('DTSTART')) {
              const colonIndex = line.indexOf(':')
              if (colonIndex !== -1) {
                const dateStr = line.substring(colonIndex + 1)
                currentEvent.start = parseICSDate(dateStr)
              }
            } else if (line.startsWith('DTEND')) {
              const colonIndex = line.indexOf(':')
              if (colonIndex !== -1) {
                const dateStr = line.substring(colonIndex + 1)
                currentEvent.end = parseICSDate(dateStr)
              }
            } else if (line.startsWith('DESCRIPTION:')) {
              const descText = line.substring(11) || ''
              let processed = descText
                .replace(/\\,/g, ',')
                .replace(/\\;/g, ';')
                .replace(/\\n/g, '\n')
                .replace(/\\N/g, '\n')
                .replace(/\\\\/g, '\\')
              currentEvent.description = processed
            }
          }
        } catch (parseError) {
          console.error('Error parsing ICS line', parseError)
        }
      }

      if (importedEvents.length === 0) {
        toast.error('No events found in file')
        setIsImporting(false)
        return
      }

      // Generate batch ID
      const batchId = crypto.randomUUID()
      const fileName = importFile.name

      // Check for import group name
      const finalGroupName = importGroupName.trim() || fileName

      // Create import group
      if (importGroupName.trim()) {
        await supabase
          .from('import_groups')
          .insert({
            batch_id: batchId,
            user_id: user.id,
            name: importGroupName.trim(),
            color: importGroupColor,
          })
      }

      // Build events to insert
      const eventsToInsert: any[] = []
      let skippedCount = 0

      for (const event of importedEvents) {
        if (!event.start || !event.title) continue

        if (!(event.start instanceof Date) || isNaN(event.start.getTime())) {
          continue
        }

        // Check for duplicates
        const existingEvent = events.find(e => {
          const existingDate = new Date(e.event_date)
          const newDate = new Date(event.start)
          return (
            e.title.toLowerCase() === event.title.toLowerCase() &&
            existingDate.getTime() === newDate.getTime()
          )
        })

        if (existingEvent) {
          skippedCount++
          continue
        }

        // Calculate duration
        const duration = event.end
          ? Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000)
          : 60

        // Calculate end time
        const endTime = event.end ? event.end : new Date(event.start.getTime() + duration * 60000)

        eventsToInsert.push({
          user_id: user.id,
          title: event.title,
          event_date: event.start.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: duration,
          description: event.description || null,
          color: importGroupColor,
          import_batch_id: batchId,
          import_file_name: fileName,
        })
      }

      if (eventsToInsert.length > 0) {
        lastLocalUpdate.current = Date.now()

        const { error } = await supabase
          .from('events')
          .insert(eventsToInsert)

        if (error) throw error

        setShowImportModal(false)
        setImportFile(null)
        setImportGroupName('')
        setImportGroupColor('blue')
        await loadUserData()

        toast.success(`Imported ${eventsToInsert.length} events${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`)
      } else {
        toast.error('No new events to import')
        setIsImporting(false)
      }
    } catch (error: any) {
      console.error('Error importing calendar:', error)
      toast.error(`Failed to import: ${error?.message || 'Invalid file format'}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get current period title
  const getCurrentPeriod = () => {
    if (currentView === 'dayGridMonth') {
      return currentCalendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    } else if (currentView === 'listDay') {
      return currentCalendarDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    } else {
      // Week view
      const startOfWeek = new Date(currentCalendarDate)
      startOfWeek.setDate(currentCalendarDate.getDate() - currentCalendarDate.getDay() + 1)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const formatWeekDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      }

      const year = startOfWeek.getFullYear() !== endOfWeek.getFullYear()
        ? `, ${startOfWeek.getFullYear()}`
        : ''

      return `${formatWeekDate(startOfWeek)} - ${formatWeekDate(endOfWeek)}${year}`
    }
  }

  // Check if we should use time grid (responsive)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const useTimeGrid = currentView === 'listDay' && !isMobile

  if (!user) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
      </main>
    )
  }

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-card border-b">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          {/* Left: Logo */}
          <LokynLogo className="h-8" />

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Tasks
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="default" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link href="/focus">
              <Button variant="ghost" size="sm" className="gap-2">
                <Timer className="h-4 w-4" />
                Focus
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="ghost" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Stats
              </Button>
            </Link>
          </nav>

          {/* Right: User Menu */}
          <UserProfileMenu user={user} userProfile={userProfile} />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-8 py-6 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center px-2">
                {getCurrentPeriod()}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
              Today
            </Button>
          </div>

          {/* Right: View toggle and actions */}
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button
                variant={currentView === 'listDay' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('listDay')}
                className="h-8 px-4 min-w-[70px]"
              >
                Day
              </Button>
              <Button
                variant={currentView === 'listWeek' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('listWeek')}
                className="h-8 px-4 min-w-[70px]"
              >
                Week
              </Button>
              <Button
                variant={currentView === 'dayGridMonth' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('dayGridMonth')}
                className="h-8 px-4 min-w-[70px]"
              >
                Month
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Import/Export dropdown */}
            <div className="relative" ref={actionsMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-8 gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border shadow-lg py-1 z-[9999]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 px-3"
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowImportModal(true)
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 px-3"
                    onClick={() => {
                      setShowActionsMenu(false)
                      exportCalendar()
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 px-3"
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowManageImports(true)
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Manage Imports
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        <div className="bg-card rounded-xl border border-border shadow-sm flex-1 min-h-0 overflow-auto p-4">
          {useTimeGrid ? (
            <TimeGridDayView
              events={events}
              date={currentCalendarDate}
              importGroupNames={importGroupNames}
              onDateClick={(time) => handleDateClick(currentCalendarDate, time)}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          ) : currentView === 'listDay' ? (
            <DayView
              events={events}
              date={currentCalendarDate}
              importGroupNames={importGroupNames}
              onDateClick={() => handleDateClick(currentCalendarDate)}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          ) : currentView === 'listWeek' ? (
            <WeekView
              events={events}
              currentCalendarDate={currentCalendarDate}
              importGroupNames={importGroupNames}
              onDateClick={handleDateClick}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          ) : (
            <MonthView
              events={events}
              currentCalendarDate={currentCalendarDate}
              importGroupNames={importGroupNames}
              onDateClick={handleDateClick}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          )}
        </div>
      </div>

      {/* Events for Date Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                Events for {formatDate(selectedDate)}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDayModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              {getSortedEventsForDate(events, selectedDate).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {getSortedEventsForDate(events, selectedDate).map((event) => {
                    const importGroupName = event.import_batch_id ? importGroupNames.get(event.import_batch_id) : undefined
                    return (
                      <EventCard
                        key={event.id}
                        event={event}
                        variant="full"
                        importGroupName={importGroupName}
                        onClick={() => {
                          setShowDayModal(false)
                          openEditEventModal(event)
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                onClick={() => {
                  setShowDayModal(false)
                  openAddEventModal()
                }}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Event
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showEventModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingEvent ? 'Edit Event' : 'New Event'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEventModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <div className="p-6">
              <EventForm
                title={eventTitle}
                date={selectedDate}
                startTime={eventStartTime}
                endTime={eventEndTime}
                isAllDay={eventIsAllDay}
                color={eventColor}
                description={eventDescription}
                onTitleChange={setEventTitle}
                onDateChange={setSelectedDate}
                onStartTimeChange={setEventStartTime}
                onEndTimeChange={setEventEndTime}
                onAllDayChange={setEventIsAllDay}
                onColorChange={setEventColor}
                onDescriptionChange={setEventDescription}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t">
              {editingEvent ? (
                <>
                  <Button variant="ghost" onClick={() => setShowEventModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editingEvent) {
                        deleteEvent(editingEvent.id)
                      }
                    }}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                  <Button onClick={saveEvent} className="flex-1">
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setShowEventModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={saveEvent} className="flex-1">
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Calendar Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Import Calendar</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportGroupName('')
                  setImportGroupColor('blue')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Import events from Google Calendar, Apple Calendar, Outlook, or any .ics file
              </p>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => {
                  const input = document.getElementById('ics-file-input') as HTMLInputElement
                  input?.click()
                }}
              >
                <input
                  id="ics-file-input"
                  type="file"
                  accept=".ics"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setImportFile(file)
                    }
                  }}
                  className="hidden"
                />
                {importFile ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload .ics file</p>
                    <p className="text-xs text-muted-foreground">
                      Supports Google Calendar, Apple Calendar, Outlook
                    </p>
                  </div>
                )}
              </div>

              {/* Import Group Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Import Group Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={importGroupName}
                  onChange={(e) => setImportGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  placeholder="e.g., School Timetable, Work Schedule"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name this import group to organize your calendar
                </p>
              </div>

              {/* Import Group Color */}
              {importGroupName && (
                <div>
                  <label className="block text-sm font-medium mb-2">Group Color</label>
                  <div className="flex gap-2">
                    {(['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink'] as EventColor[]).map((color) => {
                      const colorClasses: Record<EventColor, string> = {
                        blue: 'bg-blue-500',
                        red: 'bg-red-500',
                        green: 'bg-green-500',
                        yellow: 'bg-yellow-500',
                        purple: 'bg-purple-500',
                        orange: 'bg-orange-500',
                        pink: 'bg-pink-500',
                      }
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setImportGroupColor(color)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            importGroupColor === color
                              ? `${colorClasses[color]} border-foreground scale-110`
                              : `${colorClasses[color]} border-transparent opacity-60 hover:opacity-100`
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                  setImportGroupName('')
                  setImportGroupColor('blue')
                }}
                disabled={isImporting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={importCalendar}
                disabled={!importFile || isImporting}
                className="flex-1"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Imports Modal */}
      {showManageImports && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Manage Imports</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowManageImports(false)
                  setEditingImportGroup(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editingImportGroup ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Edit Import Group</h4>
                    <input
                      type="text"
                      value={editingImportGroup.name}
                      onChange={(e) => setEditingImportGroup({...editingImportGroup, name: e.target.value})}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      placeholder="Group name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Color</label>
                    <div className="flex gap-2">
                      {(['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink'] as EventColor[]).map((color) => {
                        const colorClasses: Record<EventColor, string> = {
                          blue: 'bg-blue-500',
                          red: 'bg-red-500',
                          green: 'bg-green-500',
                          yellow: 'bg-yellow-500',
                          purple: 'bg-purple-500',
                          orange: 'bg-orange-500',
                          pink: 'bg-pink-500',
                        }
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingImportGroup({...editingImportGroup, color})}
                            className={`w-10 h-10 rounded-lg border-2 transition-all ${
                              editingImportGroup.color === color
                                ? `${colorClasses[color]} border-foreground scale-110`
                                : `${colorClasses[color]} border-transparent opacity-60 hover:opacity-100`
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={updateImportGroup} className="flex-1">
                      Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setEditingImportGroup(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : getImports().length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No imports found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Import a calendar file to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getImports().map((imp) => (
                    <div
                      key={imp.batchId}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          imp.color === 'red' ? 'bg-red-500/10' :
                          imp.color === 'green' ? 'bg-green-500/10' :
                          imp.color === 'yellow' ? 'bg-yellow-500/10' :
                          imp.color === 'purple' ? 'bg-purple-500/10' :
                          imp.color === 'orange' ? 'bg-orange-500/10' :
                          imp.color === 'pink' ? 'bg-pink-500/10' :
                          'bg-blue-500/10'
                        }`}>
                          <FileText className={`h-5 w-5 ${
                            imp.color === 'red' ? 'text-red-500' :
                            imp.color === 'green' ? 'text-green-500' :
                            imp.color === 'yellow' ? 'text-yellow-500' :
                            imp.color === 'purple' ? 'text-purple-500' :
                            imp.color === 'orange' ? 'text-orange-500' :
                            imp.color === 'pink' ? 'text-pink-500' :
                            'text-blue-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{imp.fileName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {imp.count} event{imp.count !== 1 ? 's' : ''}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(imp.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingImportGroup({
                            batchId: imp.batchId,
                            name: imp.fileName,
                            color: (imp.color || 'blue') as EventColor,
                          })}
                          className="h-8 w-8 p-0"
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteImportBatch(imp.batchId, imp.fileName)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Deleting an import removes all events from that file. Manually created events are kept.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
