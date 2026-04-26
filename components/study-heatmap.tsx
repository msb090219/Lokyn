'use client'

import { useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Target } from 'lucide-react'

interface HeatmapDataPoint {
  study_date: string
  total_minutes: number
  session_count: number
}

interface StudyHeatmapProps {
  data: HeatmapDataPoint[]
  getHeatmapColor: (minutes: number) => string
  formatMinutes: (minutes: number) => string
  formatDate: (dateString: string) => string
  className?: string
}

export function StudyHeatmap({
  data,
  getHeatmapColor,
  formatMinutes,
  formatDate,
  className
}: StudyHeatmapProps) {
  const heatmapContainerRef = useRef<HTMLDivElement>(null)

  const renderHeatmap = () => {
    // Generate last 365 days
    const days: { date: Date; minutes: number; sessions: number }[] = []
    const today = new Date()

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dataPoint = data.find(d => {
        const dDate = new Date(d.study_date)
        dDate.setHours(0, 0, 0, 0)
        return dDate.getTime() === date.getTime()
      })

      days.push({
        date,
        minutes: dataPoint?.total_minutes || 0,
        sessions: dataPoint?.session_count || 0,
      })
    }

    // Group by weeks for GitHub-style layout
    const weeks: typeof days[] = []
    let currentWeek: typeof days = []

    days.forEach((day, index) => {
      currentWeek.push(day)
      if (currentWeek.length === 7 || index === days.length - 1) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    // Get month labels (show every 2 months)
    const monthLabels: string[] = []
    const monthsSet = new Set<string>()

    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const month = week[0].date.toLocaleDateString('en-US', { month: 'short' })
        if (!monthsSet.has(month)) {
          monthsSet.add(month)
          monthLabels.push(month)
        } else {
          monthLabels.push('')
        }
      }
    })

    // Day labels for left side
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

    return (
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-fit">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 mr-2">
            <div className="h-3"></div>
            {dayLabels.map((label, i) => (
              <div key={i} className="flex items-center text-xs text-muted-foreground" style={{ height: '12px' }}>
                {label}
              </div>
            ))}
          </div>

          {/* Month labels row */}
          <div className="flex flex-col">
            <div className="flex gap-1 mb-1">
              {monthLabels.map((month, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground"
                  style={{ minWidth: i === 0 ? '48px' : '12px', marginLeft: i === 0 ? '36px' : '0' }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => {
                    const isToday = day.date.toDateString() === new Date().toDateString()
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className="heatmap-cell rounded-sm transition-all hover:scale-125 cursor-pointer"
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: getHeatmapColor(day.minutes),
                          border: isToday ? '2px solid var(--primary)' : 'none',
                        }}
                        title={`${day.date.toLocaleDateString()}: ${formatMinutes(day.minutes)} (${day.sessions} sessions)`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map(opacity => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    )
  }

  const renderGhostHeatmap = () => {
    // Generate empty grid for ghost state
    const weeks = 53
    const daysPerWeek = 7

    return (
      <div className="opacity-30">
        <div className="flex gap-1 min-w-fit justify-center">
          {Array.from({ length: weeks }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {Array.from({ length: daysPerWeek }).map((_, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className="heatmap-cell rounded-sm"
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'hsl(0 0% 15%)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend (still visible) */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map(opacity => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Study Activity (Last 365 Days)
      </h3>

      {data.length === 0 ? (
        <div className="text-center py-8">
          {renderGhostHeatmap()}
          <p className="text-sm text-muted-foreground mt-4">
            Your study activity will appear here as you complete sessions
          </p>
        </div>
      ) : (
        renderHeatmap()
      )}
    </Card>
  )
}
