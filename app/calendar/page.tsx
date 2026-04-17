'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, CheckCircle, Calendar as CalendarIcon, Plus, Trash2, X, ChevronLeft, ChevronRight, Download, Upload, FileText, Settings, User, ChevronDown, MoreVertical, Timer, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { EventsRow } from '@/lib/types'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { AccentColorProvider } from '@/components/providers/theme-provider'

type EventColor = 'blue' | 'red' | 'green'

const colorMap = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  red: 'bg-red-500 hover:bg-red-600',
  green: 'bg-green-500 hover:bg-green-600',
}

const colorDotMap = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
}

// Helper to get initials from name
const getInitials = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0]?.substring(0, 2).toUpperCase() || 'US'
}

// Helper to generate avatar color
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

// Minimal Event Card - used across all views
function MinimalEventCard({
  event,
  onClick,
}: {
  event: EventsRow
  onClick: () => void
}) {
  const eventDate = new Date(event.event_date)
  const isAllDayEvent = event.all_day === true || (eventDate.getHours() === 0 && eventDate.getMinutes() === 0)

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
    >
      {/* Colored dot indicator */}
      <div className={`w-1.5 h-1.5 rounded-full ${colorDotMap[event.color as EventColor]} mt-1.5 flex-shrink-0`} />

      {/* Time */}
      <div className="text-xs font-medium tabular-ns text-muted-foreground min-w-[60px]">
        {isAllDayEvent ? 'All day' : eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
      </div>

      {/* Title */}
      <div className="text-sm font-medium flex-1">
        {event.title}
      </div>
    </div>
  )
}

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
// DAY VIEW COMPONENT
// ============================================================

function DayView({
  events,
  date,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  date: Date
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
          className="flex-1 flex items-center justify-center px-3 py-6 text-sm text-muted-foreground hover:bg-accent/50 cursor-pointer text-center min-h-[200px]"
          onClick={onDateClick}
        >
          No events
        </div>
      ) : (
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {dayEvents.map((event) => (
            <MinimalEventCard
              key={event.id}
              event={event}
              onClick={() => onEventClick(event)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// WEEK VIEW COMPONENT (2x4 GRID)
// ============================================================

function WeekView({
  events,
  currentCalendarDate,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  currentCalendarDate: Date
  onDateClick: (date: Date) => void
  onEventClick: (event: EventsRow) => void
}) {
  // Get week dates (start from Monday)
  const getWeekDates = (date: Date) => {
    const start = new Date(date)
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
  }

  const weekDates = getWeekDates(currentCalendarDate)
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
                    className="h-full flex items-center justify-center px-2 py-6 text-xs text-muted-foreground hover:bg-accent/50 cursor-pointer text-center min-h-[120px]"
                    onClick={() => onDateClick(date)}
                  >
                    No events
                  </div>
                ) : (
                  dayEvents.map((event) => (
                    <MinimalEventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// MONTH VIEW COMPONENT (Custom implementation)
// ============================================================

function MonthView({
  events,
  currentCalendarDate,
  onDateClick,
  onEventClick,
}: {
  events: EventsRow[]
  currentCalendarDate: Date
  onDateClick: (date: Date) => void
  onEventClick: (event: EventsRow) => void
}) {
  // Get all dates in the month
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()

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
  }

  const monthDates = getMonthDates(currentCalendarDate)
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
                    className="h-full min-h-[40px] flex items-center justify-center text-xs text-muted-foreground hover:bg-accent/50 rounded cursor-pointer"
                    onClick={() => onDateClick(date)}
                  >
                    +
                  </div>
                ) : (
                  <>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-card border border-border rounded hover:bg-accent/50 cursor-pointer truncate"
                      >
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 ${colorDotMap[event.color as EventColor]}`} />
                        <span className="text-xs truncate flex-1">
                          {event.title}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-xs text-muted-foreground px-1.5 cursor-pointer hover:bg-accent/50 rounded"
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
}

// ============================================================
// MAIN CALENDAR PAGE
// ============================================================

export default function CalendarPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accentColor, setAccentColor] = useState<string>('#3B82F6')
  const [events, setEvents] = useState<EventsRow[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventsRow | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventTime, setEventTime] = useState('12:00')
  const [eventColor, setEventColor] = useState<EventColor>('blue')
  const [isAllDay, setIsAllDay] = useState(false)
  const [currentView, setCurrentView] = useState<'listDay' | 'listWeek' | 'dayGridMonth'>('listDay')
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showManageImports, setShowManageImports] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const lastLocalUpdate = useRef<number>(0)
  const calendarRef = useRef<FullCalendar>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  // Switch view function
  const switchView = (view: 'listDay' | 'listWeek' | 'dayGridMonth') => {
    setCurrentView(view)
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(view === 'listDay' ? 'dayGridDay' : view === 'listWeek' ? 'dayGridWeek' : 'dayGridMonth')
    }
  }

  // Go to today
  const goToToday = () => {
    if (currentView === 'dayGridMonth') {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        calendarApi.today()
      }
    }
    setCurrentCalendarDate(new Date())
  }

  // Load user data and events
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

      // Load user profile
      const { data: profile } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        setAccentColor(profile.accent_color || '#3B82F6')
      }

      // Load events
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('event_date', { ascending: true })

      if (error) {
        console.error('Error loading events:', JSON.stringify(error, null, 2))
        console.error('Error message:', error?.message || 'No message')
        console.error('Error details:', error?.details || 'No details')
        console.error('Error hint:', error?.hint || 'No hint')
        throw error
      }

      setEvents(eventsData || [])

      // Subscribe to real-time changes
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

      // Store channel for cleanup
      ;(window as any).__calendarChannel = channel
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
  }, [loadUserData])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
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

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowDayModal(true)
  }

  // Open add event modal
  const openAddEventModal = () => {
    setEditingEvent(null)
    setEventTitle('')
    setEventTime('12:00')
    setEventColor('blue')
    setIsAllDay(false)
    setShowEventModal(true)
  }

  // Open edit event modal
  const openEditEventModal = (event: EventsRow) => {
    setEditingEvent(event)
    setEventTitle(event.title)
    const date = new Date(event.event_date)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    setEventTime(`${hours}:${minutes}`)
    setEventColor((event.color || 'blue') as EventColor)

    // Check if it's an all-day event (either from database flag or midnight time)
    const isAllDayEvent = event.all_day === true || (date.getHours() === 0 && date.getMinutes() === 0)
    setIsAllDay(isAllDayEvent)

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
      // Parse time and create event date
      const [hours, minutes] = eventTime.split(':').map(Number)
      const eventDate = new Date(selectedDate)

      // For all-day events, set to start of day (00:00)
      if (isAllDay) {
        eventDate.setHours(0, 0, 0, 0)
      } else {
        eventDate.setHours(hours, minutes, 0, 0)
      }

      if (editingEvent) {
        // Update existing event
        lastLocalUpdate.current = Date.now()

        const updateData: any = {
          title: eventTitle.trim(),
          event_date: eventDate.toISOString(),
          color: eventColor,
        }

        // Try to include all_day field
        const { error } = await supabase
          .from('events')
          .update({
            ...updateData,
            all_day: isAllDay,
          })
          .eq('id', editingEvent.id)

        if (error) {
          // If error about missing column, retry without all_day
          if (error.message?.includes('column') || error.code === 'PGRST204') {
            console.log('Retrying update without all_day field...')
            const { error: retryError } = await supabase
              .from('events')
              .update(updateData)
              .eq('id', editingEvent.id)

            if (retryError) throw retryError
          } else {
            throw error
          }
        }

        toast.success('Event updated')
      } else {
        // Create new event
        lastLocalUpdate.current = Date.now()

        const insertData: any = {
          user_id: user.id,
          title: eventTitle.trim(),
          event_date: eventDate.toISOString(),
          color: eventColor,
        }

        // Try to include all_day field
        const { error } = await supabase
          .from('events')
          .insert({
            ...insertData,
            all_day: isAllDay,
          })

        if (error) {
          // If error about missing column, retry without all_day
          if (error.message?.includes('column') || error.code === 'PGRST204') {
            console.log('Retrying insert without all_day field...')
            const { error: retryError } = await supabase
              .from('events')
              .insert(insertData)

            if (retryError) throw retryError
          } else {
            throw error
          }
        }

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
      await loadUserData()
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error(`Failed to delete event: ${error?.message || 'Unknown error'}`)
    }
  }

  // Get all imports grouped by batch
  const getImports = () => {
    const imports = new Map<string, { fileName: string; count: number; date: string }>()

    events.forEach(event => {
      // Only count events that have import tracking fields
      if (event.import_batch_id && event.import_file_name) {
        if (!imports.has(event.import_batch_id)) {
          imports.set(event.import_batch_id, {
            fileName: event.import_file_name,
            count: 0,
            date: event.imported_at || event.created_at || new Date().toISOString(),
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

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('user_id', user.id)
        .eq('import_batch_id', batchId)

      if (error) throw error

      toast.success(`Deleted "${fileName}"`)
      await loadUserData()
    } catch (error: any) {
      console.error('Error deleting import batch:', error)
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`)
    }
  }

  // Navigate to previous/next
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentCalendarDate)

    if (currentView === 'listDay') {
      // Day view - move by 1 day
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
      setCurrentCalendarDate(newDate)
    } else if (currentView === 'listWeek') {
      // Week view - move by 1 week
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      setCurrentCalendarDate(newDate)
    } else {
      // Month view - move by 1 month
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
      setCurrentCalendarDate(newDate)
    }
  }

  // Parse ICS date format
  const parseICSDate = (dateStr: string): Date => {
    // Format: YYYYMMDDTHHMMSSZ (UTC) or YYYYMMDDTHHMMSS (local time)
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
        // UTC time - use Date.UTC
        return new Date(Date.UTC(year, month, day, hour, minute, second))
      } else {
        // Local time - create date in local timezone
        return new Date(year, month, day, hour, minute, second)
      }
    }

    return new Date()
  }

  // Export calendar to .ics file
  const exportCalendar = async () => {
    try {
      // Generate ICS format manually
      let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//My Dashboard//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Student Calendar
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Student Calendar Events
`

      events.forEach(event => {
        const startDate = new Date(event.event_date)
        const endDate = new Date(startDate.getTime() + (event.duration_minutes || 60) * 60000)

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

      // Create and download file
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

      // Read file text with better error handling
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

      // Handle line folding (unfold continuation lines)
      const unfoldLines = (lines: string[]): string[] => {
        const result: string[] = []
        for (const line of lines) {
          if (line.startsWith(' ') || line.startsWith('\t')) {
            // Continuation line - append to previous line
            if (result.length > 0) {
              result[result.length - 1] += line.substring(1)
            }
          } else {
            result.push(line)
          }
        }
        return result
      }

      // Parse ICS file manually
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
              // Handle DTSTART with or without parameters
              const colonIndex = line.indexOf(':')
              if (colonIndex !== -1) {
                const dateStr = line.substring(colonIndex + 1)
                currentEvent.start = parseICSDate(dateStr)
              }
            } else if (line.startsWith('DTEND')) {
              // Handle DTEND with or without parameters
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
          // Skip lines with parsing errors
          console.error('Error parsing ICS line', parseError)
        }
      }

      if (importedEvents.length === 0) {
        toast.error('No events found in file')
        setIsImporting(false)
        return
      }

      // Convert and import events
      let importedCount = 0
      let skippedCount = 0
      const totalEvents = importedEvents.length

      // Generate unique batch ID for this import
      const batchId = crypto.randomUUID()
      const fileName = importFile.name

      // Build array of events to insert (batch insert for better performance)
      const eventsToInsert: any[] = []

      for (const event of importedEvents) {
        if (!event.start || !event.title) {
          continue
        }

        // Check if start is a valid date
        if (!(event.start instanceof Date) || isNaN(event.start.getTime())) {
          continue
        }

        // Check for duplicates (same title, same date/time)
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

        // Add to batch insert array
        eventsToInsert.push({
          user_id: user.id,
          title: event.title,
          event_date: event.start.toISOString(),
          description: event.description || null,
          duration_minutes: duration,
          color: 'blue',
          import_batch_id: batchId,
          import_file_name: fileName,
        })
      }

      // Batch insert all events at once (much faster for large files)
      if (eventsToInsert.length > 0) {
        lastLocalUpdate.current = Date.now()

        let insertError: any = null

        // Try to insert with import tracking (if migration has been run)
        const { data, error } = await supabase
          .from('events')
          .insert(eventsToInsert)
          .select()

        if (error) {
          insertError = error
          console.error('Error importing events (with tracking):', error)

          // If the error is about missing columns, retry without import tracking
          if (error.message?.includes('column') || error.code === 'PGRST204') {
            console.log('Retrying import without tracking fields...')

            // Remove import tracking fields and retry
            const eventsToInsertNoTracking = eventsToInsert.map(({
              import_batch_id,
              import_file_name,
              ...event
            }) => event)

            const { error: retryError } = await supabase
              .from('events')
              .insert(eventsToInsertNoTracking)
              .select()

            if (retryError) {
              console.error('Error importing events (without tracking):', retryError)
              toast.error(`Failed to import: ${retryError.message || 'Unknown error'}`)
              setIsImporting(false)
              return
            } else {
              importedCount = eventsToInsert.length
            }
          } else {
            toast.error(`Failed to import: ${error.message || JSON.stringify(error)}`)
            setIsImporting(false)
            return
          }
        } else {
          importedCount = eventsToInsert.length
        }
      }

      setShowImportModal(false)
      setImportFile(null)
      await loadUserData()

      toast.success(`Imported ${importedCount} events${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`)
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

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Format event time for display (handles all-day events)
  const formatEventTime = (event: EventsRow) => {
    if (event.all_day === true) {
      return 'All day'
    }
    // For backwards compatibility: if time is exactly midnight (00:00), treat as all-day
    const date = new Date(event.event_date)
    // Check local time (not UTC) for midnight
    const localHours = date.getHours()
    const localMinutes = date.getMinutes()

    // Check if it's exactly midnight or very close (for timezone edge cases)
    if (localHours === 0 && localMinutes === 0) {
      return 'All day'
    }
    return formatTime(event.event_date)
  }

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate.toDateString() === date.toDateString()
    }).sort((a, b) => {
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

  // Get current period title from calendar
  const getCurrentPeriod = () => {
    if (currentView === 'dayGridMonth') {
      return currentCalendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    } else if (currentView === 'listDay') {
      // Day view - show specific day
      return currentCalendarDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    } else {
      // Week view - show week range
      const startOfWeek = new Date(currentCalendarDate)
      startOfWeek.setDate(currentCalendarDate.getDate() - currentCalendarDate.getDay() + 1) // Monday

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

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

  if (loading) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  // Transform events for FullCalendar (if we need it for month view later)
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.event_date,
    backgroundColor: event.color === 'red' ? '#EF4444' : event.color === 'green' ? '#10B981' : '#3B82F6',
    borderColor: event.color === 'red' ? '#EF4444' : event.color === 'green' ? '#10B981' : '#3B82F6',
  }))

  return (
    <AccentColorProvider accentColor={accentColor}>
      <main className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Student Dashboard</h1>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label="Go to Tasks"
              >
                <CheckCircle className="h-4 w-4" />
                Tasks
              </Button>
            </Link>
            <Link href="/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label="Go to Calendar"
              >
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </Button>
            </Link>
            <Link href="/focus">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label="Go to Focus"
              >
                <Timer className="h-4 w-4" />
                Focus
              </Button>
            </Link>
            <Link href="/stats">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                aria-label="Go to Stats"
              >
                <BarChart3 className="h-4 w-4" />
                Stats
              </Button>
            </Link>
          </nav>

          {/* Right: User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userProfile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email?.split('@')[0]}</p>
              </div>
              <div className={`w-9 h-9 rounded-full ${getAvatarColor(userProfile?.full_name || user?.email || 'User')} flex items-center justify-center text-sm font-semibold text-white shadow-sm`}>
                {getInitials(userProfile?.full_name || user?.email || 'User')}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border shadow-lg py-1 z-[9999]">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 px-3"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleSignOut()
                    setShowUserMenu(false)
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
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
                aria-label="Previous"
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
                aria-label="Next"
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8"
            >
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
                onClick={() => switchView('listDay')}
                className="h-8 px-4 min-w-[70px]"
              >
                Day
              </Button>
              <Button
                variant={currentView === 'listWeek' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => switchView('listWeek')}
                className="h-8 px-4 min-w-[70px]"
              >
                Week
              </Button>
              <Button
                variant={currentView === 'dayGridMonth' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => switchView('dayGridMonth')}
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

              {/* Dropdown Menu */}
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
          {currentView === 'listDay' && (
            <DayView
              events={events}
              date={currentCalendarDate}
              onDateClick={() => handleDateClick({ date: currentCalendarDate })}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          )}

          {currentView === 'listWeek' && (
            <WeekView
              events={events}
              currentCalendarDate={currentCalendarDate}
              onDateClick={handleDateClick}
              onEventClick={(event) => {
                setSelectedDate(new Date(event.event_date))
                setShowDayModal(false)
                openEditEventModal(event)
              }}
            />
          )}

          {currentView === 'dayGridMonth' && (
            <MonthView
              events={events}
              currentCalendarDate={currentCalendarDate}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDayModal(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto p-4">
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${colorDotMap[event.color as EventColor]} mt-1 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{formatEventTime(event)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowDayModal(false)
                            openEditEventModal(event)
                          }}
                          className="h-8 w-8 p-0"
                          aria-label="Edit event"
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label="Delete event"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEventModal(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  placeholder="Event title"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <div className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-muted-foreground">
                  {selectedDate ? formatDate(selectedDate) : ''}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="all-day"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-input"
                />
                <label htmlFor="all-day" className="text-sm font-medium cursor-pointer">
                  All day
                </label>
              </div>

              {!isAllDay && (
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {(['blue', 'red', 'green'] as EventColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEventColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        eventColor === color
                          ? `${colorMap[color]} border-foreground scale-110`
                          : `${colorMap[color]} border-transparent opacity-60 hover:opacity-100`
                      }`}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t">
              {editingEvent ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowEventModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editingEvent) {
                        deleteEvent(editingEvent.id)
                        setShowEventModal(false)
                      }
                    }}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={saveEvent}
                    className="flex-1"
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowEventModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEvent}
                    className="flex-1"
                  >
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
                }}
                aria-label="Close"
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
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
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

              {importFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="skip-duplicates"
                    checked
                    disabled
                    className="rounded"
                  />
                  <label htmlFor="skip-duplicates" className="text-sm">
                    Skip duplicate events
                  </label>
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
                onClick={() => setShowManageImports(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {getImports().length === 0 ? (
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
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-500" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteImportBatch(imp.batchId, imp.fileName)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete import"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </AccentColorProvider>
  )
}
