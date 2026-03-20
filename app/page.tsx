import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Dashboard
          </h1>
          <p className="text-muted-foreground">
            Simple tasks & calendar
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-8 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Welcome!</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your personal dashboard
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-center font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md px-4 py-2 text-center font-medium transition-colors"
            >
              Create Account
            </Link>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Built with Next.js, Supabase, and shadcn/ui
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
