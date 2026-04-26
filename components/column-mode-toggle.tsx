'use client'

import { Columns2, Columns } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ColumnMode = 'single' | 'double'

interface ColumnModeToggleProps {
  mode: ColumnMode
  onModeChange: (mode: ColumnMode) => void
  label?: string
}

export function ColumnModeToggle({ mode, onModeChange, label }: ColumnModeToggleProps) {
  const handleModeChange = (newMode: ColumnMode) => {
    onModeChange(newMode)
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-overline text-muted-foreground">{label}:</span>}
      <div className="flex bg-muted rounded-lg p-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleModeChange('single')}
          className={cn(
            "h-7 px-2 gap-1.5 text-body-sm",
            mode === 'single'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Single column view"
        >
          <Columns className="h-3.5 w-3.5" />
          <span>1</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleModeChange('double')}
          className={cn(
            "h-7 px-2 gap-1.5 text-body-sm",
            mode === 'double'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Double column view"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>2</span>
        </Button>
      </div>
    </div>
  )
}
