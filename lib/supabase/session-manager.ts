import { createClient } from './client'

const REMEMBER_ME_KEY = 'remember_me_enabled'
const SESSION_TIMESTAMP_KEY = 'session_timestamp'

export const SessionManager = {
  /**
   * Save session metadata when user logs in
   * @param rememberMe - Whether the user chose to be remembered
   */
  saveSessionMetadata(rememberMe: boolean) {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
      localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    }
  },

  /**
   * Check if the user's session should persist across browser sessions
   */
  shouldPersistSession(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  },

  /**
   * Check if the persistent session is still valid (within 7 days)
   */
  isSessionValid(): boolean {
    if (typeof window === 'undefined') return false

    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!timestamp) return false

    const daysSinceLogin = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24)
    return daysSinceLogin < 7
  },

  /**
   * Clear persistent session data (called on logout)
   */
  clearPersistentSession() {
    if (typeof window === 'undefined') return

    // Clear metadata
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(SESSION_TIMESTAMP_KEY)

    // Clear all Supabase auth data from localStorage
    // Supabase stores keys like 'sb-{project_url}-auth-token'
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.includes('-auth')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  },

  /**
   * Refresh the session token to extend the session
   */
  async refreshSession() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Failed to refresh session:', error)
        this.clearPersistentSession()
        return null
      }

      return data.session
    } catch (error) {
      console.error('Error refreshing session:', error)
      this.clearPersistentSession()
      return null
    }
  },

  /**
   * Get the number of days remaining in the session
   */
  getDaysRemaining(): number {
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!timestamp) return 0

    const daysSinceLogin = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24)
    return Math.max(0, 7 - Math.floor(daysSinceLogin))
  }
}
