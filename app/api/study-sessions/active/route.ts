import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ActiveSession } from '@/lib/types'

// GET - Fetch the active (incomplete) session for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use the database function to get active session with tasks
    const { data, error } = await supabase.rpc('get_active_session_with_tasks', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Return the first result or null
    const activeSession = data && data.length > 0 ? data[0] : null

    // Parse tasks from JSONB if they exist
    let parsedSession = activeSession
    if (activeSession && activeSession.tasks) {
      parsedSession = {
        ...activeSession,
        tasks: activeSession.tasks,
      }
    }

    return NextResponse.json({
      success: true,
      session: parsedSession as ActiveSession | null,
    })
  } catch (error: any) {
    console.error('Error fetching active session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active session', details: error?.message },
      { status: 500 }
    )
  }
}
