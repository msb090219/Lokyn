'use client'

import { useState } from 'react'
import { X, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  text: string
}

interface AddTaskModalProps {
  availableTasks: Task[]
  selectedTaskIds: string[]
  onAddTasks: (taskIds: string[]) => void
  onClose: () => void
}

export function AddTaskModal({
  availableTasks,
  selectedTaskIds,
  onAddTasks,
  onClose,
}: AddTaskModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])

  const filteredTasks = availableTasks.filter(task =>
    task.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleTask = (taskId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleAdd = () => {
    onAddTasks(tempSelectedIds)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Tasks to Session</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found
            </div>
          ) : (
            filteredTasks.map(task => {
              const isSelected = tempSelectedIds.includes(task.id)
              const isAlreadyInSession = selectedTaskIds.includes(task.id)

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary",
                    isAlreadyInSession && "opacity-50"
                  )}
                  onClick={() => !isAlreadyInSession && handleToggleTask(task.id)}
                >
                  <button
                    className={cn(
                      "flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground hover:border-primary",
                      isAlreadyInSession && "cursor-not-allowed opacity-50"
                    )}
                    disabled={isAlreadyInSession}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                    )}
                  </button>
                  <span className="flex-1 text-sm">
                    {task.text}
                    {isAlreadyInSession && " (already added)"}
                  </span>
                </div>
              )
            })
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAdd} className="flex-1" disabled={tempSelectedIds.length === 0}>
            Add {tempSelectedIds.length} task{tempSelectedIds.length !== 1 ? 's' : ''}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
