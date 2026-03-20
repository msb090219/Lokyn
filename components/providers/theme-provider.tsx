'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

// Helper to convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  const hDeg = Math.round(h * 360)
  const sPercent = Math.round(s * 100)
  const lPercent = Math.round(l * 100)

  return `${hDeg} ${sPercent}% ${lPercent}%`
}

export function AccentColorProvider({ children, accentColor = '#3B82F6' }: { children: React.ReactNode; accentColor?: string }) {
  React.useEffect(() => {
    const root = document.documentElement

    // Convert hex to HSL for CSS variables
    const hsl = hexToHSL(accentColor)

    // Apply the color to all theme-related CSS variables
    root.style.setProperty('--primary', hsl)
    root.style.setProperty('--ring', hsl)
    root.style.setProperty('--accent', hsl)

    // Also store the hex value for inline styles
    root.style.setProperty('--primary-hex', accentColor)
  }, [accentColor])

  return <>{children}</>
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
