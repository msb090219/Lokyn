'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect to handle hydration and avoid mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-11 h-6 rounded-full bg-muted/50" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
        ${isDark ? 'bg-primary' : 'bg-muted'}
      `}
      aria-label="Toggle theme"
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-lg
          transition-transform duration-200 ease-in-out
          ${isDark ? 'translate-x-6' : 'translate-x-0.5'}
        `}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-primary-foreground m-1" strokeWidth={2.5} />
        ) : (
          <Sun className="h-3 w-3 text-primary m-1" strokeWidth={2.5} />
        )}
      </span>
    </button>
  )
}
