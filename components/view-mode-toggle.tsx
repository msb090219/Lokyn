'use client'

import { useEffect } from 'react'

type ViewMode = 'normal' | 'priority'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const handleModeChange = (mode: ViewMode) => {
    onViewModeChange(mode)
    localStorage.setItem('dashboard-view-mode', mode)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-overline text-muted-foreground">View:</span>
      <div className="flex bg-muted rounded-lg p-1">
        <button
          onClick={() => handleModeChange('normal')}
          className={`px-3 py-1.5 rounded-md text-body-sm transition-all ${
            viewMode === 'normal'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Normal view - sections grouped by Today/Backlog"
          aria-pressed={viewMode === 'normal'}
        >
          Section
        </button>
        <button
          onClick={() => handleModeChange('priority')}
          className={`px-3 py-1.5 rounded-md text-body-sm transition-all ${
            viewMode === 'priority'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Priority view - sections grouped by task priority"
          aria-pressed={viewMode === 'priority'}
        >
          Priority
        </button>
      </div>
    </div>
  )
}
