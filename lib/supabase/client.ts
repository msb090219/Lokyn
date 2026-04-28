import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Custom storage adapter that uses BOTH localStorage AND cookies
// This ensures the middleware can read the session from cookies
const customStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null

    // Try localStorage first (for persistence)
    let value = localStorage.getItem(key)

    // If not in localStorage, try cookie (for middleware compatibility)
    if (!value) {
      const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'))
      if (match) value = decodeURIComponent(match[2])
    }

    return value
  },

  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return

    // Store in localStorage for persistence across browser restarts
    localStorage.setItem(key, value)

    // Also store in cookie for middleware to read
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
  },

  removeItem: (key: string) => {
    if (typeof window === 'undefined') return

    localStorage.removeItem(key)

    // Also remove from cookie
    document.cookie = `${key}=; path=/; max-age=-1`
  },
}

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  // Create a persistent client instance with custom storage
  if (!clientInstance) {
    clientInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: customStorageAdapter,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    )
  }

  return clientInstance
}
