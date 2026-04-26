'use client'

import { User, Key, MessageCircle, Bell, Palette } from 'lucide-react'

interface SettingsSidebarProps {
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

export function SettingsSidebar({ activeSection, onSectionClick }: SettingsSidebarProps) {
  return (
    <nav className="w-60 h-screen sticky top-0 overflow-y-auto py-6 px-4">
      <div className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              onClick={() => onSectionClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg cursor-pointer transition-all text-left ${
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
      </div>
    </nav>
  )
}
