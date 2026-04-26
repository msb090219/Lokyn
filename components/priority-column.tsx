'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

type TaskPriority = 'none' | 'low' | 'medium' | 'high'

interface SectionWithTasks {
  id: string
  user_id: string
  column_id: string
  title: string
  collapsed: boolean
  position: number
  created_at: string
  updated_at: string
  tasks: any[]
}

interface PriorityColumnProps {
  priority: TaskPriority
  sections: SectionWithTasks[]
  label: string
  onCreateSection: () => void
  children: React.ReactNode
}

const priorityConfig = {
  high: { color: 'text-red-500', borderColor: 'border-red-500/30', hoverBorder: 'hover:border-red-500/50' },
  medium: { color: 'text-yellow-500', borderColor: 'border-yellow-500/30', hoverBorder: 'hover:border-yellow-500/50' },
  low: { color: 'text-blue-500', borderColor: 'border-blue-500/30', hoverBorder: 'hover:border-blue-500/50' },
  none: { color: 'text-muted-foreground', borderColor: 'border-border', hoverBorder: 'hover:border-primary' },
}

export function PriorityColumn({ priority, sections, label, onCreateSection, children }: PriorityColumnProps) {
  const config = priorityConfig[priority]
  const { setNodeRef } = useDroppable({ id: `col-priority-${priority}` })

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <h2 className={cn('text-overline uppercase tracking-wider mb-4 flex items-center gap-2', config.color)}>
        {label}
        <span className="text-body-sm text-muted-foreground">({sections.length})</span>
      </h2>
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar min-h-0"
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <div key={section.id}>
              {children}
            </div>
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
}
