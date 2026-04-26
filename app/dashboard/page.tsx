'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronDown, ChevronRight, Trash2, GripVertical, CheckCircle, Calendar, Timer, BarChart3, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { toast } from 'sonner'
import type { SectionsRow, TasksRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SectionWithTasks = SectionsRow & {
  tasks: TasksRow[]
}

type TaskPriority = 'none' | 'low' | 'medium' | 'high'

// Helper to sort tasks: incomplete first, completed at bottom, then by priority
const sortTasks = (tasks: TasksRow[]): TasksRow[] => {
  const priorityWeight = { high: 0, medium: 1, low: 2, none: 3 }

  return [...tasks].sort((a, b) => {
    // Both incomplete or both completed: sort by priority
    if (a.completed === b.completed) {
      const aPriority = priorityWeight[a.priority || 'none']
      const bPriority = priorityWeight[b.priority || 'none']
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      // Same priority: maintain original order (by position)
      return a.position - b.position
    }
    // Incomplete tasks (completed: false) come first
    return a.completed ? 1 : -1
  })
}

// Priority Flag Component
function PriorityFlag({
  priority,
  onPriorityChange,
  disabled = false,
  className = '',
}: {
  priority: TaskPriority
  onPriorityChange: (priority: TaskPriority) => void
  disabled?: boolean
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
    }
  }, [isOpen, updateDropdownPosition])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleScroll() {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen])

  const priorityConfig = {
    none: { color: 'text-muted-foreground hover:text-foreground', label: 'No Priority' },
    low: { color: 'text-blue-500 hover:text-blue-600', label: 'Low Priority' },
    medium: { color: 'text-yellow-500 hover:text-yellow-600', label: 'Medium Priority' },
    high: { color: 'text-red-500 hover:text-red-600', label: 'High Priority' },
  }

  const config = priorityConfig[priority]

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`transition-colors p-1 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'} ${config.color}`}
        disabled={disabled}
        aria-label={config.label}
      >
        <Flag className={`h-4 w-4 ${priority !== 'none' ? 'fill-current' : ''}`} />
      </button>

      {isOpen && !disabled &&
        typeof document !== 'undefined' &&
        document.body && (
          createPortal(
            <div
              className="fixed bg-card border border-border rounded-lg shadow-lg z-[9999] p-1 min-w-[140px]"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              {(
                [
                  { value: 'high' as const, label: 'High', color: 'text-red-500' },
                  { value: 'medium' as const, label: 'Medium', color: 'text-yellow-500' },
                  { value: 'low' as const, label: 'Low', color: 'text-blue-500' },
                  { value: 'none' as const, label: 'None', color: 'text-muted-foreground' },
                ]
              ).map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => {
                    onPriorityChange(value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-body-sm text-left hover:bg-primary hover:text-primary-foreground transition-colors ${
                    priority === value ? 'bg-accent' : ''
                  }`}
                >
                  <Flag className={`h-4 w-4 ${color} ${value !== 'none' ? 'fill-current' : ''}`} />
                  <span className={color}>{label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        )}
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({
  id,
  label,
  children,
  onCreateSection,
}: {
  id: 'col-today' | 'col-backlog'
  label: string
  children: React.ReactNode
  onCreateSection: (columnId: 'col-today' | 'col-backlog') => void
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <h2 className="text-overline uppercase tracking-wider text-muted-foreground mb-4">
        {label}
      </h2>
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar min-h-0"
      >
        <SortableContext
          items={Array.isArray(children)
            ? React.Children.toArray(children).map((child: any) => child?.key?.toString() || '')
            : []
          }
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </div>
      <Button
        onClick={() => onCreateSection(id)}
        variant="ghost"
        className="w-full mt-4 border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-all"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Section
      </Button>
    </section>
  )
}

// Utility: Group sections by their highest task priority - COMMENTED OUT - priority view disabled
/*
function groupSectionsByPriority(sections: SectionWithTasks[]): Record<'high' | 'medium' | 'low' | 'none', SectionWithTasks[]> {
  const groups: Record<'high' | 'medium' | 'low' | 'none', SectionWithTasks[]> = {
    high: [],
    medium: [],
    low: [],
    none: [],
  }

  sections.forEach(section => {
    const priorities = section.tasks.map(t => t.priority || 'none')
    const priorityWeight = { high: 0, medium: 1, low: 2, none: 3 }

    // Get highest priority (lowest weight) in section
    const highestPriority = priorities.reduce((highest, current) => {
      return priorityWeight[current] < priorityWeight[highest] ? current : highest
    }, 'none' as TaskPriority)

    groups[highestPriority].push(section)
  })

  return groups
}
*/

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [todaySections, setTodaySections] = useState<SectionWithTasks[]>([])
  const [backlogSections, setBacklogSections] = useState<SectionWithTasks[]>([])
  const [activeSection, setActiveSection] = useState<SectionWithTasks | null>(null)
  const [activeTask, setActiveTask] = useState<TasksRow | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [forceOpenSectionId, setForceOpenSectionId] = useState<string | null>(null)
  const [activeSessionTaskId, setActiveSessionTaskId] = useState<string | null>(null)
  const lastLocalUpdate = useRef<number>(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    loadUserData()
  }, [])

  // Load active session
  useEffect(() => {
    const loadActiveSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/active')
        if (response.ok) {
          const data = await response.json()
          if (data.session && data.session.task_id) {
            setActiveSessionTaskId(data.session.task_id)
          } else {
            setActiveSessionTaskId(null)
          }
        }
      } catch (error) {
        console.error('Error loading active session:', error)
      }
    }

    loadActiveSession()

    // Poll for active session changes every 10 seconds
    const interval = setInterval(loadActiveSession, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadUserData = async (): Promise<void> => {
    try {
      const supabase = createClient()

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUser(session.user)

      // Load sections with tasks in parallel with profile
      const [sectionsResult, profileResult] = await Promise.all([
        supabase
          .from('sections')
          .select(`
            *,
            tasks (*)
          `)
          .eq('user_id', session.user.id)
          .order('position', { ascending: true }),
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
      ])

      const { data: sections, error } = sectionsResult
      const { data: profile } = profileResult

      if (profile) {
        setUserProfile(profile)
      }

      if (error) throw error

      // Separate by column and sort tasks within each section
      const today = sections?.filter(s => s.column_id === 'col-today') || []
      const backlog = sections?.filter(s => s.column_id === 'col-backlog') || []

      // Sort tasks: incomplete first, completed at bottom
      const sortedToday = today.map(s => ({
        ...s,
        tasks: sortTasks(s.tasks)
      }))
      const sortedBacklog = backlog.map(s => ({
        ...s,
        tasks: sortTasks(s.tasks)
      }))

      setTodaySections(sortedToday as SectionWithTasks[])
      setBacklogSections(sortedBacklog as SectionWithTasks[])

      // Subscribe to real-time changes
      const channel = supabase
        .channel('dashboard-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sections',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            // Ignore updates within 1 second of local changes (prevents self-triggered reloads)
            if (Date.now() - lastLocalUpdate.current < 1000) return
            console.log('Section changed:', payload)
            loadUserData() // Reload data on changes
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            // Ignore updates within 1 second of local changes (prevents self-triggered reloads)
            if (Date.now() - lastLocalUpdate.current < 1000) return
            console.log('Task changed:', payload)
            loadUserData() // Reload data on changes
          }
        )
        .subscribe()

      // Store channel for cleanup (would need ref for proper cleanup)
      ;(window as any).__dashboardChannel = channel
    } catch (error: any) {
      console.error('Error loading data:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message || 'No message')
      console.error('Error details:', error?.details || 'No details')
      console.error('Error hint:', error?.hint || 'No hint')
      toast.error(`Failed to load dashboard: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const createSection = async (columnId: 'col-today' | 'col-backlog') => {
    const supabase = createClient()

    // Get current max position
    const sections = columnId === 'col-today' ? todaySections : backlogSections
    const maxPosition = sections.length > 0 ? Math.max(...sections.map(s => s.position)) : -1

    const { error } = await supabase
      .from('sections')
      .insert({
        user_id: user.id,
        column_id: columnId,
        title: '', // Empty title, user will edit
        collapsed: false,
        position: maxPosition + 1,
      })

    if (error) {
      toast.error('Failed to create section')
      return
    }

    toast.success('Section created! Click the title to edit it.')
    await loadUserData()
  }

  const createTask = async (sectionId: string) => {
    const supabase = createClient()

    // Get section to find which column it's in
    const allSections = [...todaySections, ...backlogSections]
    const section = allSections.find(s => s.id === sectionId)
    if (!section) return

    // Force section to open
    setForceOpenSectionId(sectionId)

    // Update database if section was collapsed
    if (section.collapsed) {
      supabase
        .from('sections')
        .update({ collapsed: false })
        .eq('id', sectionId)
    }

    // Get current max position
    const maxPosition = section.tasks.length > 0
      ? Math.max(...section.tasks.map(t => t.position))
      : -1

    // Create task and get the returned data
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        section_id: sectionId,
        text: '', // Empty text, user will edit
        completed: false,
        position: maxPosition + 1,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create task')
      setForceOpenSectionId(null)
      return
    }

    // Update local state with new task (optimistic update)
    const newTask = data as TasksRow
    const addTaskToSection = (sections: SectionWithTasks[]) =>
      sections.map(s => s.id === sectionId ? { ...s, tasks: sortTasks([...s.tasks, newTask]) } : s)

    const isToday = todaySections.some(s => s.id === sectionId)
    if (isToday) {
      setTodaySections(addTaskToSection(todaySections))
    } else {
      setBacklogSections(addTaskToSection(backlogSections))
    }

    // Set the new task as editing
    setEditingTaskId(data.id)
    lastLocalUpdate.current = Date.now()
  }

  const continueCreatingTask = async (sectionId: string) => {
    // Simply call createTask - it will create a new empty task and set it as editing
    await createTask(sectionId)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const allSections = [...todaySections, ...backlogSections]
    const allTasks = allSections.flatMap(s => s.tasks)

    // Check if it's a section
    const section = allSections.find(s => s.id === active.id)
    if (section) {
      setActiveSection(section)
      return
    }

    // Check if it's a task
    const task = allTasks.find(t => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveSection(null)
    setActiveTask(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dragging a section
    const isTodaySection = todaySections.some(s => s.id === activeId)
    const isBacklogSection = backlogSections.some(s => s.id === activeId)

    if (isTodaySection || isBacklogSection) {
      const section = isTodaySection
        ? todaySections.find(s => s.id === activeId)
        : backlogSections.find(s => s.id === activeId)

      if (!section) return

      // Check if dropping on a different column (today vs backlog)
      const targetColumnId = overId === 'col-today' || overId === 'col-backlog'
        ? overId
        : null

      // Also check if dropping on another section in a different column
      let targetSectionColumn = null
      const todayTarget = todaySections.find(s => s.id === overId)
      const backlogTarget = backlogSections.find(s => s.id === overId)

      if (todayTarget) targetSectionColumn = 'col-today'
      if (backlogTarget) targetSectionColumn = 'col-backlog'

      const movingToDifferentColumn = targetColumnId || targetSectionColumn

      if (movingToDifferentColumn && movingToDifferentColumn !== section.column_id) {
        // Moving section to different column
        const newColumnId = movingToDifferentColumn

        // Update UI immediately
        const updatedSection = { ...section, column_id: newColumnId as 'col-today' | 'col-backlog' }

        // Remove from source column
        if (section.column_id === 'col-today') {
          setTodaySections(prev => prev.filter(s => s.id !== activeId))
        } else {
          setBacklogSections(prev => prev.filter(s => s.id !== activeId))
        }

        // Add to target column at the end
        if (newColumnId === 'col-today') {
          setTodaySections(prev => [...prev, { ...updatedSection, position: prev.length }])
        } else {
          setBacklogSections(prev => [...prev, { ...updatedSection, position: prev.length }])
        }

        // Sync with database
        try {
          const supabase = createClient()
          const { error } = await supabase
            .from('sections')
            .update({ column_id: newColumnId })
            .eq('id', activeId)

          if (error) throw error

          toast.success(`Section moved to "${newColumnId === 'col-today' ? 'Today' : 'Backlog'}"`)
          await loadUserData()
        } catch {
          toast.error('Failed to move section')
          await loadUserData()
        }
        return
      }

      // Section reordering (within same column only)
      const sections = isTodaySection ? [...todaySections] : [...backlogSections]
      const oldIndex = sections.findIndex(s => s.id === activeId)
      const newIndex = sections.findIndex(s => s.id === overId)

      if (oldIndex === -1 || newIndex === -1) return

      // Update UI immediately
      const updated = arrayMove(sections, oldIndex, newIndex)

      if (isTodaySection) {
        setTodaySections(updated)
      } else {
        setBacklogSections(updated)
      }

      // Update positions in database
      try {
        const supabase = createClient()
        await Promise.all(updated.map((s, i) =>
          supabase.from('sections').update({ position: i }).eq('id', s.id)
        ))
      } catch {
        toast.error('Failed to reorder sections')
        await loadUserData()
      }
      return
    }

    // Task dragging - find the task and which section it's in
    let activeTask: TasksRow | null = null
    let sourceSection: SectionWithTasks | null = null
    let targetSection: SectionWithTasks | null = null

    for (const section of [...todaySections, ...backlogSections]) {
      const task = section.tasks.find(t => t.id === activeId)
      if (task) {
        activeTask = task
        sourceSection = section
      }
      if (section.id === overId || section.tasks.some(t => t.id === overId)) {
        targetSection = section
      }
    }

    if (!activeTask || !targetSection) return

    // If dropping on the same section, just reorder
    if (sourceSection?.id === targetSection.id) {
      const tasks = [...targetSection.tasks]
      const oldIndex = tasks.findIndex(t => t.id === activeId)
      const newIndex = tasks.findIndex(t => t.id === overId)

      if (oldIndex === -1 || newIndex === -1) return

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)

      // Update positions in database to match the new order
      const newPositions = reorderedTasks.map((t, i) => ({
        id: t.id,
        position: i
      }))

      // Update UI immediately (optimistic)
      if (todaySections.some(s => s.id === targetSection.id)) {
        setTodaySections(prev => prev.map(s =>
          s.id === targetSection.id ? { ...s, tasks: reorderedTasks } : s
        ))
      } else {
        setBacklogSections(prev => prev.map(s =>
          s.id === targetSection.id ? { ...s, tasks: reorderedTasks } : s
        ))
      }

      // Update positions in database
      try {
        const supabase = createClient()
        await Promise.all(newPositions.map(({ id, position }) =>
          supabase.from('tasks').update({ position }).eq('id', id)
        ))
      } catch {
        toast.error('Failed to reorder tasks')
        await loadUserData() // Revert on error
      }
    } else {
      // Moving task to a different section (optimistic update)
      if (!sourceSection) return

      // Create optimistic task with new section_id
      const optimisticTask = { ...activeTask, section_id: targetSection.id }

      // Remove from source section and sort
      const updatedSource = {
        ...sourceSection,
        tasks: sortTasks(sourceSection.tasks.filter(t => t.id !== activeTask.id))
      }

      // Add to target section and sort
      const updatedTarget = {
        ...targetSection,
        tasks: sortTasks([...targetSection.tasks, optimisticTask])
      }

      // Update UI immediately
      const updateSection = (sections: SectionWithTasks[], id: string, newData: SectionWithTasks) =>
        sections.map(s => s.id === id ? newData : s)

      setTodaySections(prev =>
        updateSection(
          updateSection(prev, sourceSection.id, updatedSource),
          targetSection.id,
          updatedTarget
        )
      )
      setBacklogSections(prev =>
        updateSection(
          updateSection(prev, sourceSection.id, updatedSource),
          targetSection.id,
          updatedTarget
        )
      )

      // Sync with database
      try {
        const supabase = createClient()
        const maxPosition = targetSection.tasks.length > 0
          ? Math.max(...targetSection.tasks.map(t => t.position))
          : -1

        const { error } = await supabase
          .from('tasks')
          .update({ section_id: targetSection.id, position: maxPosition + 1 })
          .eq('id', activeTask.id)

        if (error) throw error

        toast.success(`Task moved to "${targetSection.title || 'Untitled Section'}"`)
        await loadUserData()
      } catch {
        toast.error('Failed to move task')
        await loadUserData() // Revert on error
      }
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
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
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-h6">Lokyn</h1>
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
                <Calendar className="h-4 w-4" />
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
          <UserProfileMenu user={user} userProfile={userProfile} />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-8 py-6 flex-1 flex flex-col overflow-hidden">
        {/* View Mode Toggle - COMMENTED OUT
        <div className="flex items-center mb-4">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={(mode) => {
            setViewMode(mode)
            localStorage.setItem('dashboard-view-mode', mode)
          }} />
        </div>
        */}

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Always show normal view - priority view commented out */}
          {/* {viewMode === 'normal' ? ( */}
            <>
              {/* Content Grid - Simple 2-column layout (50/50) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Frontlog Half */}
                <div className="flex flex-col min-h-0">
                  {/* Frontlog Header */}
                  <div className="flex items-center justify-between pb-6">
                    <h2 className="text-h3 font-semibold text-foreground">Frontlog</h2>
                  </div>

                  {/* Frontlog Content */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar min-h-0">
                    <SortableContext items={todaySections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {todaySections.map((section) => (
                        <DraggableSection
                          key={section.id}
                          section={section}
                          onCreateTask={createTask}
                          onUpdate={loadUserData}
                          onLocalUpdate={(timestamp) => lastLocalUpdate.current = timestamp}
                          editingTaskId={editingTaskId}
                          onClearEditingTask={() => {
                            setEditingTaskId(null)
                            setForceOpenSectionId(null)
                          }}
                          forceOpen={forceOpenSectionId === section.id}
                          activeSessionTaskId={activeSessionTaskId}
                          onContinueCreating={continueCreatingTask}
                        />
                      ))}
                    </SortableContext>
                    {todaySections.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <p className="text-body-sm">No sections yet. Create one to get started!</p>
                      </div>
                    )}
                  </div>

                  {/* Add Section button */}
                  <Button
                    onClick={() => createSection('col-today')}
                    variant="ghost"
                    className="w-full mt-4 border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-all"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </div>

                {/* Backlog Half */}
                <div className="flex flex-col min-h-0">
                  {/* Backlog Header */}
                  <div className="flex items-center justify-between pb-6">
                    <h2 className="text-h3 font-semibold text-foreground">Backlog</h2>
                  </div>

                  {/* Backlog Content */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar min-h-0">
                    <SortableContext items={backlogSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {backlogSections.map((section) => (
                        <DraggableSection
                          key={section.id}
                          section={section}
                          onCreateTask={createTask}
                          onUpdate={loadUserData}
                          onLocalUpdate={(timestamp) => lastLocalUpdate.current = timestamp}
                          editingTaskId={editingTaskId}
                          onClearEditingTask={() => {
                            setEditingTaskId(null)
                            setForceOpenSectionId(null)
                          }}
                          forceOpen={forceOpenSectionId === section.id}
                          activeSessionTaskId={activeSessionTaskId}
                          onContinueCreating={continueCreatingTask}
                        />
                      ))}
                    </SortableContext>
                    {backlogSections.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <p className="text-body-sm">No sections yet. Create one to get started!</p>
                      </div>
                    )}
                  </div>

                  {/* Add Section button */}
                  <Button
                    onClick={() => createSection('col-backlog')}
                    variant="ghost"
                    className="w-full mt-4 border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-all"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </div>
              </div>
            </>
          {/* ) : ( */}
            {/* Priority View: 4 Priority Columns - COMMENTED OUT
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 flex-1 min-h-0">
              {(['high', 'medium', 'low', 'none'] as const).map((priority) => {
                const sections = priorityGroups?.[priority] || []
                const label = priority.charAt(0).toUpperCase() + priority.slice(1)
                const colors = {
                  high: 'text-foreground',
                  medium: 'text-foreground',
                  low: 'text-foreground',
                  none: 'text-foreground'
                }
                const borderColors = {
                  high: 'border-l-4 border-l-red-500',
                  medium: 'border-l-4 border-l-yellow-500',
                  low: 'border-l-4 border-l-blue-500',
                  none: 'border-l-4 border-l-muted-foreground'
                }

                return (
                  <section key={priority} className={`flex flex-col min-h-0 ${borderColors[priority]}`}>
                    <div className="pb-6 pl-4">
                      <h2 className={`text-h3 font-semibold ${colors[priority]}`}>
                        {label} <span className="text-body-sm text-muted-foreground ml-2">({sections.length})</span>
                      </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar min-h-0">
                      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {sections.map((section) => (
                          <DraggableSection
                            key={section.id}
                            section={section}
                            onCreateTask={createTask}
                            onUpdate={loadUserData}
                            onLocalUpdate={(timestamp) => lastLocalUpdate.current = timestamp}
                            editingTaskId={editingTaskId}
                            onClearEditingTask={() => {
                              setEditingTaskId(null)
                              setForceOpenSectionId(null)
                            }}
                            forceOpen={forceOpenSectionId === section.id}
                            activeSessionTaskId={activeSessionTaskId}
                          />
                        ))}
                      </SortableContext>
                      {sections.length === 0 && (
                        <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg">
                          <p className="text-body-sm">No {label.toLowerCase()} tasks</p>
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          */}
          {/* ) } */}

          <DragOverlay>
            {activeSection && (
              <div className="bg-card rounded-xl border border-border shadow-2xl rotate-3 opacity-95 cursor-grabbing w-full max-w-md">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-h5">
                    {activeSection.title || 'Untitled Section'}
                  </h3>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
            {activeTask && (
              <div className="flex items-center gap-3 rounded-lg border bg-card shadow-2xl rotate-2 opacity-95 cursor-grabbing p-3 w-full max-w-md">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <div className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                  activeTask.completed
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground'
                }`}>
                  {activeTask.completed && (
                    <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <p className={`flex-1 text-body-sm ${activeTask.completed ? 'line-through text-muted-foreground' : ''} ${!activeTask.text ? 'italic text-muted-foreground' : ''}`}>
                  {activeTask.text || 'Untitled task'}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </main>
  )
}

function DraggableSection({
  section,
  onCreateTask,
  onUpdate,
  onLocalUpdate,
  editingTaskId,
  onClearEditingTask,
  forceOpen,
  activeSessionTaskId,
  onContinueCreating,
}: {
  section: SectionWithTasks
  onCreateTask: (sectionId: string) => Promise<void>
  onUpdate: () => Promise<void>
  onLocalUpdate: (timestamp: number) => void
  editingTaskId: string | null
  onClearEditingTask: () => void
  forceOpen: boolean
  activeSessionTaskId: string | null
  onContinueCreating?: (sectionId: string) => Promise<void>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SectionCard
        section={section}
        onCreateTask={onCreateTask}
        onUpdate={onUpdate}
        onContinueCreating={onContinueCreating}
        onLocalUpdate={onLocalUpdate}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        editingTaskId={editingTaskId}
        onClearEditingTask={onClearEditingTask}
        forceOpen={forceOpen}
        activeSessionTaskId={activeSessionTaskId}
      />
    </div>
  )
}

function SectionCard({
  section,
  onCreateTask,
  onUpdate,
  onLocalUpdate,
  dragHandleListeners,
  dragHandleAttributes,
  editingTaskId,
  onClearEditingTask,
  forceOpen,
  activeSessionTaskId,
  onContinueCreating,
}: {
  section: SectionWithTasks
  onCreateTask: (sectionId: string) => Promise<void>
  onUpdate: () => Promise<void>
  onLocalUpdate: (timestamp: number) => void
  dragHandleListeners?: React.HTMLAttributes<HTMLDivElement>
  dragHandleAttributes?: React.HTMLAttributes<HTMLDivElement>
  editingTaskId: string | null
  onClearEditingTask: () => void
  forceOpen: boolean
  activeSessionTaskId: string | null
  onContinueCreating?: (sectionId: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(section.title)
  const [collapsed, setCollapsed] = useState(section.collapsed)
  const [optimisticCollapsed, setOptimisticCollapsed] = useState<boolean | null>(null)
  const displayCollapsed = forceOpen ? false : (optimisticCollapsed ?? collapsed)
  const { setNodeRef: setDroppableRef } = useDroppable({ id: section.id })

  // Sync local collapsed state with prop
  useEffect(() => {
    setCollapsed(section.collapsed)
  }, [section.collapsed])

  const updateTitle = async (newTitle: string) => {
    if (!newTitle.trim()) {
      // Delete section if title is empty
      const supabase = createClient()
      await supabase.from('sections').delete().eq('id', section.id)
      toast.success('Section removed')
      await onUpdate()
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('sections')
      .update({ title: newTitle })
      .eq('id', section.id)

    if (error) {
      toast.error('Failed to update section title')
      return
    }

    setTitle(newTitle)
    setIsEditing(false)
    await onUpdate()
  }

  const toggleCollapse = async () => {
    const newState = !collapsed

    // Set timestamp to prevent real-time subscription from reloading
    onLocalUpdate(Date.now())

    // Update UI immediately
    setOptimisticCollapsed(newState)

    // Sync with database
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sections')
        .update({ collapsed: newState })
        .eq('id', section.id)

      if (error) throw error
      setCollapsed(newState)
      setOptimisticCollapsed(null) // Clear optimistic state after confirm
    } catch {
      // Revert on error
      setOptimisticCollapsed(collapsed)
      toast.error('Failed to toggle section')
    }
  }

  const deleteSection = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', section.id)

    if (error) {
      toast.error('Failed to delete section')
      return
    }

    toast.success('Section deleted')
    await onUpdate()
  }

  const completedTasks = section.tasks.filter(t => t.completed)
  const clearCompleted = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('section_id', section.id)
      .eq('completed', true)

    if (error) {
      toast.error('Failed to clear completed tasks')
      return
    }

    toast.success(`${completedTasks.length} task${completedTasks.length !== 1 ? 's' : ''} cleared`)
    await onUpdate()
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:border-primary hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 transition-colors">
        {/* Drag Handle */}
        <div
          {...dragHandleListeners}
          {...dragHandleAttributes}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors relative flex-shrink-0"
        >
          <div className="hit-area-extend absolute inset-0 min-h-[44px] min-w-[44px] -m-[19px]" />
          <GripVertical className="h-5 w-5 relative z-10" />
        </div>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => updateTitle(title)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateTitle(title)
              } else if (e.key === 'Escape') {
                setTitle(section.title)
                setIsEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-h5 outline-none flex-1 min-w-0 text-foreground"
            placeholder="Section name"
            autoFocus
          />
        ) : (
          <h3
            className="text-h5 flex-1 min-w-0 text-foreground"
            onDoubleClick={() => setIsEditing(true)}
          >
            {title || 'Untitled Section'}
          </h3>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              deleteSection()
            }}
            className="h-8 w-8 p-0 flex items-center justify-center text-foreground hover:text-destructive-foreground hover:bg-destructive relative"
            aria-label="Delete section"
          >
            <div className="hit-area-extend absolute inset-0 min-h-[44px] min-w-[44px] -m-[18px]" />
            <Trash2 className="h-4 w-4 relative z-10" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapse()
            }}
            className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground relative"
            aria-label="Toggle collapse"
          >
            <div className="hit-area-extend absolute inset-0 min-h-[44px] min-w-[44px] -m-[18px]" />
            {displayCollapsed ? <ChevronRight className="h-4 w-4 relative z-10" /> : <ChevronDown className="h-4 w-4 relative z-10" />}
          </Button>
        </div>
      </div>

      {/* Tasks */}
      {!displayCollapsed && (
        <div ref={setDroppableRef} className="p-4 space-y-3">
          <SortableContext
            items={section.tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {section.tasks.map((task) => (
              <DraggableTask
                key={task.id}
                task={task}
                sectionId={section.id}
                onUpdate={onUpdate}
                editingTaskId={editingTaskId}
                onClearEditingTask={onClearEditingTask}
                onContinueCreating={onContinueCreating}
                activeSessionTaskId={activeSessionTaskId}
              />
            ))}
          </SortableContext>
          {section.tasks.length === 0 && (
            <p className="text-body-sm text-muted-foreground text-center py-4">
              No tasks yet. Add your first task!
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 pt-0 space-y-2">
        <Button
          onClick={() => onCreateTask(section.id)}
          variant="ghost"
          className="w-full justify-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
        {completedTasks.length > 0 && (
          <Button
            onClick={clearCompleted}
            variant="ghost"
            className="w-full text-body-sm text-muted-foreground hover:text-destructive"
          >
            Clear Completed ({completedTasks.length})
          </Button>
        )}
      </div>
    </div>
  )
}

function DraggableTask({
  task,
  sectionId,
  onUpdate,
  editingTaskId,
  onClearEditingTask,
  onContinueCreating,
  activeSessionTaskId,
}: {
  task: TasksRow
  sectionId: string
  onUpdate: () => Promise<void>
  editingTaskId: string | null
  onClearEditingTask: () => void
  onContinueCreating?: (sectionId: string) => Promise<void>
  activeSessionTaskId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        sectionId={sectionId}
        onUpdate={onUpdate}
        dragHandleListeners={listeners}
        editingTaskId={editingTaskId}
        onClearEditingTask={onClearEditingTask}
        onContinueCreating={onContinueCreating}
        activeSessionTaskId={activeSessionTaskId}
      />
    </div>
  )
}

function TaskCard({
  task,
  sectionId,
  onUpdate,
  dragHandleListeners,
  editingTaskId,
  onClearEditingTask,
  onContinueCreating,
  activeSessionTaskId,
}: {
  task: TasksRow
  sectionId: string
  onUpdate: () => Promise<void>
  dragHandleListeners?: React.HTMLAttributes<HTMLDivElement>
  editingTaskId: string | null
  onClearEditingTask: () => void
  onContinueCreating?: (sectionId: string) => Promise<void>
  activeSessionTaskId: string | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null)
  const [optimisticPriority, setOptimisticPriority] = useState<TaskPriority | null>(null)
  const displayCompleted = optimisticCompleted ?? task.completed
  const displayPriority = optimisticPriority ?? (task.priority || 'none')

  // Auto-start editing if this is the newly created task
  useEffect(() => {
    if (editingTaskId === task.id) {
      setIsEditing(true)
    }
  }, [editingTaskId, task.id])

  // Click-outside detection for empty tasks
  useEffect(() => {
    // Only active when editing an empty task
    if (!isEditing || text.trim()) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside this task card
      const card = target.closest('.group') // TaskCard has 'group' class
      if (!card || card.getAttribute('data-task-id') !== task.id) {
        // Clicked outside - cancel editing and delete empty task
        setIsEditing(false)
        onClearEditingTask()
        // Delete the empty task
        const supabase = createClient()
        supabase.from('tasks').delete().eq('id', task.id).then(() => {
          onUpdate()
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, text, task.id, onUpdate, onClearEditingTask])

  const toggleComplete = async () => {
    const newState = !task.completed

    // Update UI immediately
    setOptimisticCompleted(newState)

    // Sync with database
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ completed: newState })
        .eq('id', task.id)

      if (error) throw error
      await onUpdate() // This will reload and re-sort all tasks
    } catch {
      // Revert on error
      setOptimisticCompleted(task.completed)
      toast.error('Failed to update task')
    }
  }

  const changePriority = async (newPriority: TaskPriority) => {
    // Update UI immediately
    setOptimisticPriority(newPriority)

    // Sync with database
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ priority: newPriority })
        .eq('id', task.id)

      if (error) throw error
      await onUpdate() // This will reload and re-sort all tasks
    } catch {
      // Revert on error
      setOptimisticPriority(task.priority || 'none')
      toast.error('Failed to update priority')
    }
  }

  const updateText = async (newText: string) => {
    if (!newText.trim()) {
      // Delete task if text is empty
      const supabase = createClient()
      await supabase.from('tasks').delete().eq('id', task.id)
      setIsEditing(false)
      onClearEditingTask()
      await onUpdate()
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({ text: newText })
      .eq('id', task.id)

    if (error) {
      toast.error('Failed to update task')
      return
    }

    setText(newText)
    setIsEditing(false)
    onClearEditingTask()
    await onUpdate()

    // Create next empty task for continuous entry
    if (onContinueCreating) {
      await onContinueCreating(sectionId)
    }
  }

  const deleteTask = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id)

    if (error) {
      toast.error('Failed to delete task')
      return
    }

    toast.success('Task deleted')
    await onUpdate()
  }

  return (
    <div data-task-id={task.id} className={`bg-card group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary hover:shadow-sm ${displayCompleted ? 'opacity-60' : ''} ${
      activeSessionTaskId === task.id
        ? 'border-primary shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse'
        : 'border-border'
    }`}>
      {/* Drag Handle */}
      <div
        {...dragHandleListeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary-foreground hover:bg-primary rounded transition-colors relative"
      >
        <div className="hit-area-extend absolute inset-0 min-h-[44px] min-w-[44px] -m-[19px]" />
        <GripVertical className="h-5 w-5 relative z-10" />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleComplete()
        }}
        className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
          displayCompleted
            ? 'bg-primary border-primary scale-110'
            : 'border-muted-foreground hover:border-primary hover:scale-110'
        }`}
        aria-label="Toggle task completion"
      >
        <div className="hit-area-extend absolute inset-0 min-h-[44px] min-w-[44px] -m-[19px]" />
        {displayCompleted && (
          <svg className="h-3.5 w-3.5 text-primary-foreground relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Task Text */}
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={async () => {
            if (!text.trim()) {
              // Empty task: just cancel editing, don't save
              setIsEditing(false)
              onClearEditingTask()
              // Delete the empty task from database
              const supabase = createClient()
              await supabase.from('tasks').delete().eq('id', task.id)
              await onUpdate()
            } else {
              // Has text: save as normal
              await updateText(text)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateText(text)
            } else if (e.key === 'Escape') {
              setText(task.text)
              setIsEditing(false)
              onClearEditingTask()
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent outline-none text-foreground"
          placeholder="Task name"
          autoFocus
        />
      ) : (
        <p
          className={`flex-1 text-body ${displayCompleted ? 'line-through text-muted-foreground' : 'text-foreground'} ${!text ? 'italic text-muted-foreground' : ''}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {text || 'Untitled task'}
        </p>
      )}

      {/* Priority Flag */}
      <PriorityFlag
        priority={displayPriority}
        onPriorityChange={changePriority}
        disabled={displayCompleted}
        className="ml-3"
      />

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          deleteTask()
        }}
        className="h-8 w-8 p-0 flex-shrink-0 text-foreground hover:text-destructive-foreground hover:bg-destructive relative"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
