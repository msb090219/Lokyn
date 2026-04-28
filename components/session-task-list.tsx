'use client'

import { Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionTask {
  id: string
  task_id: string
  task: { id: string; text: string }
  completed: boolean
  position: number
}

interface SessionTaskListProps {
  tasks: SessionTask[]
  onUpdateTaskCompletion: (taskId: string, completed: boolean) => void
  onRemoveTask: (taskId: string) => void
  onAddTask: () => void
  disabled?: boolean
}

export function SessionTaskList({
  tasks,
  onUpdateTaskCompletion,
  onRemoveTask,
  onAddTask,
  disabled = false,
}: SessionTaskListProps) {
  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No tasks selected'
            : `Studying: ${completedCount}/${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}`
          }
        </span>
        {!disabled && (
          <Button variant="ghost" size="sm" onClick={onAddTask} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            Add Tasks
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No tasks selected for this session
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((sessionTask) => (
            <div
              key={sessionTask.id}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg border transition-all",
                sessionTask.completed && "opacity-60",
                "border-border hover:border-primary"
              )}
            >
              <button
                onClick={() => onUpdateTaskCompletion(sessionTask.id, !sessionTask.completed)}
                className={cn(
                  "flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
                  sessionTask.completed
                    ? "bg-primary border-primary"
                    : "border-muted-foreground hover:border-primary"
                )}
              >
                {sessionTask.completed && (
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                )}
              </button>

              <span
                className={cn(
                  "flex-1 text-sm",
                  sessionTask.completed && "line-through text-muted-foreground"
                )}
              >
                {sessionTask.task.text}
              </span>

              {!disabled && (
                <button
                  onClick={() => onRemoveTask(sessionTask.id)}
                  className="h-6 w-6 flex items-center justify-center text-foreground hover:text-destructive-foreground hover:bg-destructive rounded transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
