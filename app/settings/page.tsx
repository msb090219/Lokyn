'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, CheckCircle, Calendar as CalendarIcon, Settings, User, Key, Bell, Save, Copy, Check, Shield, Lock, ChevronDown, Info, Palette, AlertCircle } from 'lucide-react'
import { AccentColorProvider } from '@/components/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

// Helper to convert hex to RGB
function hexToRgb(hex: string) {
  hex = hex.replace('#', '')
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  }
}

// Helper to calculate perceived brightness
function getBrightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  // Using the formula for relative luminance
  return (r * 299 + g * 587 + b * 114) / 1000
}

// Validate if color is appropriate for the current theme
function validateColorForTheme(hex: string, isDark: boolean): { valid: boolean; message?: string } {
  const brightness = getBrightness(hex)

  if (isDark) {
    // Dark mode: need brightness > 80 (not too dark)
    if (brightness < 80) {
      return {
        valid: false,
        message: 'This color is too dark for dark mode. Please choose a brighter color.'
      }
    }
  } else {
    // Light mode: need brightness < 180 (not too light)
    if (brightness > 180) {
      return {
        valid: false,
        message: 'This color is too light for light mode. Please choose a darker color.'
      }
    }
  }

  return { valid: true }
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

// ============================================================
// SHARED COMPONENTS
// ============================================================

// Minimal Section Card
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="bg-muted/30 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // User profile settings
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  // API Keys
  const [nullclawApiKey, setNullclawApiKey] = useState('')
  const [showNullclawKey, setShowNullclawKey] = useState(false)

  // Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [accentColor, setAccentColor] = useState('#3B82F6')  // Default blue as hex
  const [colorValidation, setColorValidation] = useState<{ valid: boolean; message?: string }>({ valid: true })

  useEffect(() => {
    loadUserData()
  }, [])

  // Revalidate color when theme changes
  useEffect(() => {
    if (resolvedTheme) {
      const isDark = resolvedTheme === 'dark'
      setColorValidation(validateColorForTheme(accentColor, isDark))
    }
  }, [resolvedTheme, accentColor])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createClient()

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUser(session.user)

      // Load user profile
      const { data: profile } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setNullclawApiKey(profile.nullclaw_api_key || '')
        setNotificationsEnabled(profile.notifications_enabled ?? true)
        setAccentColor(profile.accent_color || '#3B82F6')
      }

      setEmail(session.user.email || '')
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    toast.success('Signed out successfully')
  }

  const saveSettings = async () => {
    // Validate color before saving
    const isDark = resolvedTheme === 'dark'
    const validation = validateColorForTheme(accentColor, isDark)

    if (!validation.valid) {
      toast.error(validation.message || 'Please choose a different color')
      setColorValidation(validation)
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      // Update or create user preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          email: email,
          nullclaw_api_key: nullclawApiKey,
          notifications_enabled: notificationsEnabled,
          accent_color: accentColor,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      toast.success('Settings saved successfully')
      setColorValidation({ valid: true })
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(`Failed to save: ${error?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  if (loading) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  return (
    <AccentColorProvider accentColor={accentColor}>
      <main className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">My Dashboard</h1>
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
                <CalendarIcon className="h-4 w-4" />
                Calendar
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
                <p className="text-sm font-medium">{fullName || 'User'}</p>
                <p className="text-xs text-muted-foreground">{email?.split('@')[0]}</p>
              </div>
              <div className={`w-9 h-9 rounded-full ${getAvatarColor(fullName || email || 'User')} flex items-center justify-center text-sm font-semibold text-white shadow-sm`}>
                {getInitials(fullName || email || 'User')}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg border border-border shadow-lg py-1 z-[9999]">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{email}</p>
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

      {/* Main Content */}
      <div className="container mx-auto px-8 py-6 flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${getAvatarColor(fullName || email)} flex items-center justify-center text-lg font-semibold text-white shadow-sm`}>
                {getInitials(fullName || email || 'User')}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold truncate">{fullName || 'Welcome!'}</h1>
                <p className="text-sm text-muted-foreground truncate">{email}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Settings
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <SectionCard
            icon={User}
            title="Profile Information"
            description="Manage your account details"
          >
            <div>
              <label className="block text-xs font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm text-muted-foreground cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Email is managed by your authentication provider
              </p>
            </div>
          </SectionCard>

          {/* API Keys Section */}
          <SectionCard
            icon={Key}
            title="API Keys & Integrations"
            description="Connect external services and AI agents"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium">NullClaw API Key</label>
                {!nullclawApiKey && (
                  <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                    Required
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNullclawKey ? 'text' : 'password'}
                    value={nullclawApiKey}
                    onChange={(e) => setNullclawApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono pr-24"
                    placeholder="Enter your NullClaw API key"
                  />
                  {nullclawApiKey && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNullclawKey(!showNullclawKey)}
                        type="button"
                        className="h-7 px-2 text-xs"
                      >
                        {showNullclawKey ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(nullclawApiKey)}
                        type="button"
                        className="h-7 w-7 p-0"
                      >
                        {copiedKey ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">About NullClaw Integration</p>
                  <p>Allows NullClaw AI agent to manage tasks and calendar via Discord. Generate a secure key with: <code className="bg-background px-1 rounded">openssl rand -hex 32</code></p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Preferences Section */}
          <SectionCard
            icon={Palette}
            title="Appearance"
            description="Customize the look and feel"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium">Theme Color</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => {
                      const newColor = e.target.value
                      setAccentColor(newColor)
                      // Validate color for current theme
                      const isDark = resolvedTheme === 'dark'
                      setColorValidation(validateColorForTheme(newColor, isDark))
                    }}
                    className={`w-20 h-20 rounded-lg cursor-pointer border-2 transition-colors ${
                      !colorValidation.valid ? 'border-red-500' : 'border-border hover:border-primary'
                    }`}
                    style={{ backgroundColor: accentColor }}
                  />
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none border-2 border-transparent"
                    style={{
                      borderColor: accentColor,
                      boxShadow: `0 0 0 2px ${accentColor}40`
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Pick your theme color</p>
                  <p className="text-xs text-muted-foreground">
                    {resolvedTheme === 'dark'
                      ? 'Choose a bright color for good contrast in dark mode'
                      : 'Choose a dark color for good contrast in light mode'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: accentColor }}
                    />
                    <code className="text-xs font-mono">{accentColor.toUpperCase()}</code>
                  </div>

                  {!colorValidation.valid && (
                    <div className="mt-2 flex items-center gap-2 text-red-500 text-xs">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>{colorValidation.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Notifications Section */}
          <SectionCard
            icon={Bell}
            title="Notifications"
            description="Manage your notification preferences"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive reminders for tasks and events</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                  notificationsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
                type="button"
              >
                <span
                  className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 shadow-sm transition-transform duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </SectionCard>

          {/* Save Button */}
          <div className="flex justify-end sticky bottom-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
    </AccentColorProvider>
  )
}
