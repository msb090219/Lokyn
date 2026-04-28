'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Key, Bell, Save, Copy, Check, Shield, Lock, Info, Palette, MessageCircle, RefreshCw, Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import UserProfileMenu from '@/components/user-profile-menu'
import { SettingsSidebar } from '@/components/settings-sidebar'
import { SettingsMobileDrawer } from '@/components/settings-mobile-drawer'
import { toast } from 'sonner'

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
            <h2 className="text-body-sm font-semibold">{title}</h2>
            <p className="text-caption text-muted-foreground">{description}</p>
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
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [activeSection, setActiveSection] = useState('section-profile-card')
  const [showMobileDrawer, setShowMobileDrawer] = useState(false)
  const contentAreaRef = useRef<HTMLDivElement>(null)

  // User profile settings
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  // API Keys
  const [nullclawApiKey, setNullclawApiKey] = useState('')
  const [showNullclawKey, setShowNullclawKey] = useState(false)

  // Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Discord
  const [discordLinkToken, setDiscordLinkToken] = useState('')
  const [discordLinked, setDiscordLinked] = useState(false)
  const [discordUsername, setDiscordUsername] = useState('')
  const [generatingToken, setGeneratingToken] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  // Intersection Observer for scroll-based active section detection
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, {
      root: contentAreaRef.current,
      threshold: 0.3,
      rootMargin: '-10% 0px -60% 0px'
    })

    // Observe all sections
    const sections = document.querySelectorAll('[id^="section-"]')
    sections.forEach(section => observer.observe(section))

    return () => observer.disconnect()
  }, [loading])

  // Smooth scroll handler
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

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
        setUserProfile(profile)
        setFullName(profile.full_name || '')
        setNullclawApiKey(profile.nullclaw_api_key || '')
        setNotificationsEnabled(profile.notifications_enabled ?? true)
        setDiscordLinkToken(profile.discord_link_token || '')
      }

      // Check Discord connection
      const { data: discordConnection } = await supabase
        .from('discord_connections')
        .select('discord_user_id')
        .eq('user_id', session.user.id)
        .single()

      if (discordConnection) {
        setDiscordLinked(true)
        setDiscordUsername(discordConnection.discord_user_id)
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
    setSaving(true)
    try {
      const supabase = createClient()

      // Get current session to ensure we have the user ID
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.user?.id) {
        throw new Error('Not authenticated')
      }

      // Update or create user preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          full_name: fullName,
          email: email,
          nullclaw_api_key: nullclawApiKey,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      toast.success('Settings saved successfully')
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

  const generateDiscordToken = async () => {
    setGeneratingToken(true)
    try {
      const supabase = createClient()

      // Generate a random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Save to user preferences
      const { error } = await supabase
        .from('user_preferences')
        .update({
          discord_link_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setDiscordLinkToken(token)
      toast.success('Discord link token generated!')
    } catch (error: any) {
      console.error('Error generating token:', error)
      toast.error(`Failed to generate token: ${error?.message || 'Unknown error'}`)
    } finally {
      setGeneratingToken(false)
    }
  }

  const disconnectDiscord = async () => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('discord_connections')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setDiscordLinked(false)
      setDiscordUsername('')
      toast.success('Discord account disconnected')
    } catch (error: any) {
      console.error('Error disconnecting Discord:', error)
      toast.error(`Failed to disconnect: ${error?.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <main className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
      </main>
    )
  }

  return (
    <main className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-card border-b">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back Button + Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-body-sm font-medium">Back</span>
            </button>
            {/* Mobile hamburger menu */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setShowMobileDrawer(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Right: User Menu */}
          <UserProfileMenu user={user} userProfile={userProfile} onSignOut={handleSignOut} />
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - overlay positioned on the left */}
        <aside className="hidden md:block absolute left-0 top-0 h-full z-10">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />
        </aside>

        {/* Content area - scrollable, centered to viewport */}
        <div
          ref={contentAreaRef}
          className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth"
        >
          <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <div id="section-profile-card" className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${getAvatarColor(userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User')} flex items-center justify-center text-lg font-semibold text-white shadow-sm`}>
                {getInitials(userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User')}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-h5 font-semibold truncate">{userProfile?.full_name || user?.user_metadata?.full_name || 'Welcome!'}</h1>
                <p className="text-body-sm text-muted-foreground truncate">{email}</p>
              </div>
              <div className="text-caption text-muted-foreground">
                Settings
              </div>
            </div>
          </div>

          {/* Profile Section */}
          <div id="section-profile-info">
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
              <p className="text-caption text-muted-foreground mt-2 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Email is managed by your authentication provider
              </p>
            </div>
          </SectionCard>
          </div>

          {/* API Keys Section */}
          <div id="section-api-keys">
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
          </div>

          {/* Discord Integration Section */}
          <div id="section-discord">
          <SectionCard
            icon={MessageCircle}
            title="Discord Integration"
            description="Link your Discord account to manage tasks via bot"
          >
            {discordLinked ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-body-sm font-medium">Connected</p>
                      <p className="text-caption text-muted-foreground">User ID: {discordUsername}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectDiscord}
                    className="gap-2"
                  >
                    Disconnect
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Discord Bot Commands</p>
                    <p>Use these commands in your Discord server:</p>
                    <ul className="mt-1 space-y-0.5 font-mono text-xs">
                      <li>• <code>/task add &lt;text&gt;</code> - Add a task</li>
                      <li>• <code>/task list</code> - List all tasks</li>
                      <li>• <code>/task complete &lt;num&gt;</code> - Complete task</li>
                      <li>• <code>/stats summary</code> - View productivity stats</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-body-sm text-muted-foreground">
                  Connect your Discord account to manage tasks and view stats using slash commands.
                </p>

                {!discordLinkToken ? (
                  <Button
                    onClick={generateDiscordToken}
                    disabled={generatingToken}
                    className="gap-2"
                  >
                    {generatingToken ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Generate Link Token
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={discordLinkToken}
                        readOnly
                        className="w-full px-3 py-2 rounded-lg border border-input bg-muted font-mono text-sm pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(discordLinkToken)}
                          type="button"
                          className="h-7 px-2 text-xs"
                        >
                          {copiedKey ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">How to link your account:</p>
                        <ol className="space-y-1 list-decimal list-inside">
                          <li>Copy the token above</li>
                          <li>Go to your Discord server</li>
                          <li>Use the command: <code className="bg-background px-1 rounded">/link {discordLinkToken}</code></li>
                        </ol>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateDiscordToken}
                      disabled={generatingToken}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Generate New Token
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
          </div>

          {/* Notifications Section */}
          <div id="section-notifications">
          <SectionCard
            icon={Bell}
            title="Notifications"
            description="Manage your notification preferences"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-body-sm font-medium">Enable Notifications</p>
                  <p className="text-caption text-muted-foreground">Receive reminders for tasks and events</p>
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
          </div>

          {/* Appearance Section - need to find this section */}
          <div id="section-appearance">
          <SectionCard
            icon={Palette}
            title="Appearance"
            description="Customize the look and feel"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-body-sm font-medium">Theme</p>
                  <p className="text-caption text-muted-foreground">Switch between light and dark mode</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </SectionCard>
          </div>

          </div> {/* Close max-w-2xl container */}
        </div> {/* Close content area */}
      </div> {/* Close two-column container */}

      {/* Fixed position save button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={saveSettings}
          disabled={saving}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow gap-2"
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

      {/* Mobile drawer (shown on mobile) */}
      <SettingsMobileDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        activeSection={activeSection}
        onSectionClick={(id) => {
          scrollToSection(id)
          setShowMobileDrawer(false)
        }}
      />
    </main>
  )
}
