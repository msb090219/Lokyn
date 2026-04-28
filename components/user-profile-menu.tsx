'use client'

import { useState, useRef, useEffect, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { SessionManager } from '@/lib/supabase/session-manager'

// Helper to get initials from name
const getInitials = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0]?.substring(0, 2).toUpperCase() || 'US'
}

// Helper to generate avatar color (shades of blue only)
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-400',
    'bg-blue-500',
    'bg-blue-600',
    'bg-indigo-400',
    'bg-indigo-500',
    'bg-indigo-600',
    'bg-sky-400',
    'bg-sky-500',
    'bg-sky-600',
    'bg-cyan-500',
    'bg-cyan-600',
    'bg-cyan-700',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

interface UserProfileMenuProps {
  user: any
  userProfile?: any
  onSignOut?: () => Promise<void>
}

function UserProfileMenu({ user, userProfile, onSignOut }: UserProfileMenuProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fullName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User'

  // Calculate position for portal dropdown
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }

  const handleSignOut = async () => {
    setShowUserMenu(false)

    // Clear persistent session data
    SessionManager.clearPersistentSession()

    const supabase = createClient()
    await supabase.auth.signOut()

    router.push('/auth/login')
    toast.success('Signed out successfully')
  }

  // Toggle menu
  const toggleMenu = () => {
    const newState = !showUserMenu
    if (newState) {
      // Calculate position BEFORE showing the dropdown to prevent "flying in" animation
      updateDropdownPosition()
      // Then show it in the next frame
      requestAnimationFrame(() => {
        setShowUserMenu(true)
      })
    } else {
      setShowUserMenu(false)
    }
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update position on scroll/resize
  useEffect(() => {
    if (showUserMenu) {
      updateDropdownPosition()
      const handleScroll = () => {
        setShowUserMenu(false)
      }
      const handleResize = () => {
        updateDropdownPosition()
      }

      window.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [showUserMenu])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false)
        buttonRef.current?.focus()
      }
    }

    if (showUserMenu) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showUserMenu])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="relative group"
        aria-label="User menu"
        aria-expanded={showUserMenu}
        aria-haspopup="true"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-out
                        hover:ring-2 hover:ring-primary/50 hover:ring-offset-2
                        hover:scale-105 active:scale-95
                        ${getAvatarColor(fullName)}`}>
          <span className="text-sm font-semibold text-white">
            {getInitials(fullName)}
          </span>
        </div>
      </button>

      {showUserMenu && (
        <div
          ref={dropdownRef}
          className="fixed w-56 bg-card rounded-xl border border-border
                     shadow-xl shadow-primary/5 overflow-hidden z-[100]
                     animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          {/* User info section */}
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-0.5">Signed in as</p>
            <p className="text-sm font-semibold truncate">{user?.email}</p>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-primary hover:text-primary-foreground transition-colors duration-150">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm">{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 border border-border/50 shadow-sm ${
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              }`}
              aria-label="Toggle theme"
            >
              <span
                className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 shadow-md transition-transform duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Settings link */}
          <Link href="/settings" onClick={() => setShowUserMenu(false)}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-2.5
                         hover:bg-primary hover:text-primary-foreground
                         transition-colors duration-150"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </Link>

          {/* Sign out button */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 px-4 py-2.5
                       hover:bg-primary hover:text-primary-foreground
                       transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      )}
    </>
  )
}

// Memoize UserProfileMenu to prevent unnecessary re-renders
export default memo(UserProfileMenu, (prev, next) => {
  return prev.user?.id === next.user?.id && prev.userProfile === next.userProfile
})
