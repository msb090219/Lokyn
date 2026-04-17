'use client'

import { useState, useRef, useEffect } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DurationPreset {
  label: string
  study: number
  break: number
}

interface TimerSettingsMenuProps {
  studyDuration: number
  breakDuration: number
  onDurationChange: (study: number, breakTime: number) => void
  presets: DurationPreset[]
  className?: string
}

export function TimerSettingsMenu({
  studyDuration,
  breakDuration,
  onDurationChange,
  presets,
  className
}: TimerSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customStudy, setCustomStudy] = useState(studyDuration)
  const [customBreak, setCustomBreak] = useState(breakDuration)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleApplyCustom = () => {
    onDurationChange(customStudy, customBreak)
    setCustomBreak(customBreak)
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="h-9 w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Timer settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Timer Duration</h3>

            {/* Presets */}
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">Presets</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map(preset => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onDurationChange(preset.study, preset.break)
                      setCustomStudy(preset.study)
                      setCustomBreak(preset.break)
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Duration */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Custom</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Study (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customStudy}
                    onChange={(e) => setCustomStudy(parseInt(e.target.value) || 25)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Break (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customBreak}
                    onChange={(e) => setCustomBreak(parseInt(e.target.value) || 5)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleApplyCustom}
              >
                Apply Custom Duration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
