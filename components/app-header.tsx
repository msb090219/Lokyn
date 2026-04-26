'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, Calendar, Timer, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { LokynLogo } from '@/components/lokyne-logo'

interface AppHeaderProps {
  activePage: 'dashboard' | 'calendar' | 'focus' | 'stats'
  user: any
  userProfile?: any
  onNavigationAttempt?: () => Promise<boolean> // Returns true if navigation should be allowed
}

export function AppHeader({ activePage, user, userProfile, onNavigationAttempt }: AppHeaderProps) {
  const router = useRouter()

  const getPageInfo = (page: string) => {
    switch (page) {
      case 'dashboard':
        return { icon: CheckCircle, title: 'Tasks' }
      case 'calendar':
        return { icon: Calendar, title: 'Calendar' }
      case 'focus':
        return { icon: Timer, title: 'Focus' }
      case 'stats':
        return { icon: BarChart3, title: 'Statistics' }
      default:
        return { icon: CheckCircle, title: 'Tasks' }
    }
  }

  const { icon: PageIcon, title } = getPageInfo(activePage)

  const handleNavigation = async (href: string, e: React.MouseEvent) => {
    // Check if there's a navigation guard
    if (onNavigationAttempt) {
      const allowed = await onNavigationAttempt()
      if (!allowed) {
        e.preventDefault()
        e.stopPropagation()
        return // Navigation blocked
      }
    }
    router.push(href)
  }

  return (
    <header className="sticky top-0 z-[100] bg-card border-b">
      <div className="container mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <PageIcon className="h-6 w-6 text-primary" />
          <LokynLogo className="h-8" />
        </div>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant={activePage === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            aria-label="Go to Tasks"
            onClick={(e) => handleNavigation('/dashboard', e)}
          >
            <CheckCircle className="h-4 w-4" />
            Tasks
          </Button>
          <Button
            variant={activePage === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            aria-label="Go to Calendar"
            onClick={(e) => handleNavigation('/calendar', e)}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={activePage === 'focus' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            aria-label="Go to Focus"
            onClick={(e) => handleNavigation('/focus', e)}
          >
            <Timer className="h-4 w-4" />
            Focus
          </Button>
          <Button
            variant={activePage === 'stats' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            aria-label="Go to Stats"
            onClick={(e) => handleNavigation('/stats', e)}
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </Button>
        </nav>

        {/* Right: User Menu */}
        <UserProfileMenu user={user} userProfile={userProfile} />
      </div>
    </header>
  )
}
