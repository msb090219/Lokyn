import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import type { ActiveSession } from '@/lib/types'

// GET - Fetch the active (incomplete) session for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use the database function to get active session
    const { data, error } = await supabase.rpc('get_active_session', {
      p_user_id: user.id,
    })

    if (error) throw error

    // Return the first result or null
    const activeSession = data && data.length > 0 ? data[0] : null

    return NextResponse.json({
      success: true,
      session: activeSession as ActiveSession | null,
    })
  } catch (error: any) {
    console.error('Error fetching active session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active session', details: error?.message },
      { status: 500 }
    )
  }
}
