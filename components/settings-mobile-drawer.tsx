'use client'

import { useEffect } from 'react'
import { User, Key, MessageCircle, Bell, Palette, X } from 'lucide-react'

interface SettingsMobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeSection: string
  onSectionClick: (sectionId: string) => void
}

const navigationItems = [
  { id: 'section-profile-card', label: 'Profile', icon: User },
  { id: 'section-profile-info', label: 'Profile Information', icon: User },
  { id: 'section-api-keys', label: 'API Keys', icon: Key },
  { id: 'section-discord', label: 'Discord Integration', icon: MessageCircle },
  { id: 'section-notifications', label: 'Notifications', icon: Bell },
  { id: 'section-appearance', label: 'Appearance', icon: Palette },
]

export function SettingsMobileDrawer({
  isOpen,
  onClose,
  activeSection,
  onSectionClick,
}: SettingsMobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-[201] md:hidden transform transition-transform duration-300 translate-x-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Close settings menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-73px)]">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSectionClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
