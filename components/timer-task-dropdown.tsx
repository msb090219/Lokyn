'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  text: string
}

interface TimerTaskDropdownProps {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string | null) => void
  className?: string
}

export function TimerTaskDropdown({
  tasks,
  selectedTaskId,
  onSelectTask,
  className
}: TimerTaskDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted-foreground hover:text-foreground gap-1 h-auto py-1"
      >
        {selectedTask ? (
          <>
            <span className="text-muted-foreground">Studying:</span>
            <span className="font-medium text-foreground">{selectedTask.text}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Select a task...</span>
        )}
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-1">
            {selectedTask && (
              <>
                {/* Unlink task option */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => {
                    onSelectTask(null)
                    setIsOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">Unlink task</span>
                </Button>

                <div className="border-t border-border my-1" />
              </>
            )}

            {/* Task list */}
            {tasks.length === 0 ? (
              <div className="py-3 px-3 text-sm text-muted-foreground text-center">
                No active tasks. Go to Dashboard to create tasks.
              </div>
            ) : (
              tasks.map(task => (
                <Button
                  key={task.id}
                  variant={task.id === selectedTaskId ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => {
                    onSelectTask(task.id)
                    setIsOpen(false)
                  }}
                >
                  {task.text}
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
