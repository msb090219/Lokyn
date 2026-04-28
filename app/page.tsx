'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Timer, BarChart, Menu, X } from 'lucide-react'
import { LokynLogo } from '@/components/lokyne-logo'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignIn = async () => {
    // Check if user is already logged in
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      // Already logged in, go to dashboard
      router.push('/dashboard')
    } else {
      // Not logged in, go to login page
      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          <LokynLogo className="h-8" link={false} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignIn}
              className="hover:scale-105 transition-transform"
            >
              Sign In
            </Button>
            <Link href="/auth/signup">
              <Button variant="default" size="sm" className="hover:scale-105 transition-transform">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="container mx-auto px-8 py-4 flex flex-col gap-3">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false)
                  await handleSignIn()
                }}
              >
                <Button variant="ghost" size="lg" className="w-full justify-start hover:scale-105 transition-transform">
                  Sign In
                </Button>
              </button>
              <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="default" size="lg" className="w-full justify-start hover:scale-105 transition-transform">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-h1 md:text-display-lg font-bold text-foreground mb-6">
              Stay on top of school — without overcomplicating it.
            </h1>
            <p className="text-body-lg text-muted-foreground mb-8">
              A simple dashboard for tasks, study sessions, and progress tracking.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button variant="default" size="lg" className="hover:scale-105 transition-transform">
                  Sign Up
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={handleSignIn}
                className="hover:scale-105 transition-transform"
              >
                Sign In
              </Button>
            </div>
          </div>

          {/* Wireframe Mockup */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-lg border border-border overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Browser Chrome */}
              <div className="bg-muted border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                <div className="flex-1 ml-4">
                  <div className="h-3 bg-muted-foreground/10 rounded max-w-xs mx-auto" />
                </div>
              </div>

              {/* Dashboard Wireframe */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Today Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-5 bg-muted-foreground/20 rounded w-20" />
                      <div className="h-8 bg-muted-foreground/10 rounded w-8" />
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="h-4 bg-muted-foreground/15 rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="h-4 bg-muted-foreground/15 rounded w-2/3" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-3/4" />
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="h-4 bg-muted-foreground/15 rounded w-4/5" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-1/3" />
                    </div>
                  </div>

                  {/* Backlog Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-5 bg-muted-foreground/20 rounded w-24" />
                      <div className="h-8 bg-muted-foreground/10 rounded w-8" />
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="h-4 bg-muted-foreground/15 rounded w-1/2" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-2/3" />
                    </div>
                    <div className="bg-muted/30 rounded-lg border border-border p-4 space-y-3 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="h-4 bg-muted-foreground/15 rounded w-3/5" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="h-8 bg-muted-foreground/15 rounded w-12 mx-auto mb-2" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-16 mx-auto" />
                    </div>
                    <div className="text-center">
                      <div className="h-8 bg-muted-foreground/15 rounded w-12 mx-auto mb-2" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-16 mx-auto" />
                    </div>
                    <div className="text-center">
                      <div className="h-8 bg-muted-foreground/15 rounded w-12 mx-auto mb-2" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-16 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-h2 font-bold text-foreground mb-2">500+</div>
              <div className="text-body text-muted-foreground">Students</div>
            </div>
            <div>
              <div className="text-h2 font-bold text-foreground mb-2">10,000+</div>
              <div className="text-body text-muted-foreground">Tasks Tracked</div>
            </div>
            <div>
              <div className="text-h2 font-bold text-foreground mb-2">1,000+</div>
              <div className="text-body text-muted-foreground">Study Hours</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="text-h2 font-semibold text-foreground">
              Everything you need
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="text-h4 font-semibold text-foreground">
                  Tasks, simplified
                </h3>
              </div>
              <p className="text-body text-muted-foreground">
                Organise what matters today without distractions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="text-h4 font-semibold text-foreground">
                  Study sessions that build consistency
                </h3>
              </div>
              <p className="text-body text-muted-foreground">
                Track your time and turn effort into routine.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-3">
                <BarChart className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <h3 className="text-h4 font-semibold text-foreground">
                  Progress you can actually see
                </h3>
              </div>
              <p className="text-body text-muted-foreground">
                Streaks, hours, and stats — all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-h2 font-semibold text-foreground mb-4">
              Mobile app coming soon
            </h2>
            <p className="text-body-lg text-muted-foreground mb-8">
              Take your dashboard anywhere.
            </p>
            <p className="text-body-sm text-muted-foreground">
              AI and Discord integrations planned.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-muted-foreground">
              © Lokyn
            </p>
            <p className="text-body-sm text-muted-foreground">
              Free forever
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
