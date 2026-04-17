'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Calendar, Timer, BarChart3, Settings, LogOut, ChevronDown, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  activePage: 'dashboard' | 'calendar' | 'focus' | 'stats'
  user: any
  userProfile?: any
}

// Helper to get initials from name
const getInitials = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0]?.substring(0, 2).toUpperCase() || 'US'
}

// Helper to generate avatar color
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

export function AppHeader({ activePage, user, userProfile }: AppHeaderProps) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Close dropdown when clicking outside
  useState(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  const getPageInfo = (page: string) => {
    switch (page) {
      case 'dashboard':
        return { icon: CheckCircle, title: 'My Dashboard' }
      case 'calendar':
        return { icon: Calendar, title: 'Calendar' }
      case 'focus':
        return { icon: Timer, title: 'Focus' }
      case 'stats':
        return { icon: BarChart3, title: 'Statistics' }
      default:
        return { icon: CheckCircle, title: 'My Dashboard' }
    }
  }

  const { icon: PageIcon, title } = getPageInfo(activePage)

  return (
    <header className="sticky top-0 z-10 bg-card border-b">
      <div className="container mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <PageIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{title}</h1>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-label="Go to Tasks"
            >
              <CheckCircle className="h-4 w-4" />
              Tasks
            </Button>
          </Link>
          <Link href="/calendar">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-label="Go to Calendar"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link href="/focus">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-label="Go to Focus"
            >
              <Timer className="h-4 w-4" />
              Focus
            </Button>
          </Link>
          <Link href="/stats">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              aria-label="Go to Stats"
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
          </Link>
        </nav>

        {/* Right: User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{userProfile?.full_name || user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email?.split('@')[0]}</p>
            </div>
            <div className={`w-9 h-9 rounded-full ${getAvatarColor(userProfile?.full_name || user?.email || 'User')} flex items-center justify-center text-sm font-semibold text-white shadow-sm`}>
              {getInitials(userProfile?.full_name || user?.email || 'User')}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border shadow-lg py-1 z-[9999]">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 px-3"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleSignOut()
                  setShowUserMenu(false)
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
