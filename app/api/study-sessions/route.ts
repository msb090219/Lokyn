import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { StudySessionsInsert, StudySessionsUpdate } from '@/lib/types'

// GET - Fetch study sessions for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // 'study', 'break', or null for all

    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type && (type === 'study' || type === 'break')) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      sessions: data,
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error('Error fetching study sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study sessions', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Create a new study session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, task_ids, title, duration_minutes, type = 'study' } = body

    // Validation
    if (!duration_minutes || duration_minutes <= 0) {
      return NextResponse.json(
        { error: 'Duration must be greater than 0' },
        { status: 400 }
      )
    }

    if (type !== 'study' && type !== 'break') {
      return NextResponse.json(
        { error: 'Type must be either "study" or "break"' },
        { status: 400 }
      )
    }

    const insertData: StudySessionsInsert = {
      user_id: user.id,
      task_id: task_id || null,
      title: title || (type === 'study' ? 'Study Session' : 'Break'),
      duration_minutes,
      type,
      started_at: new Date().toISOString(),
    }

    const { data: session, error: insertError } = await supabase
      .from('study_sessions')
      .insert(insertData)
      .select()
      .single()

    if (insertError) throw insertError

    // If multiple tasks provided, create junction records
    let sessionTasks = []
    if (task_ids && task_ids.length > 0) {
      const tasksToInsert = task_ids.map((taskId: string, index: number) => ({
        session_id: session.id,
        task_id: taskId,
        position: index,
        completed: false,
      }))

      const { data: tasksData, error: tasksError } = await supabase
        .from('session_tasks')
        .insert(tasksToInsert)
        .select('*, task(id, text)')

      if (tasksError) {
        // Log error but don't fail - session was created successfully
        console.error('Failed to create session tasks:', tasksError)
      } else {
        sessionTasks = tasksData || []
      }
    }

    return NextResponse.json({
      success: true,
      session: { ...session, tasks: sessionTasks },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating study session:', error)
    return NextResponse.json(
      { error: 'Failed to create study session', details: error?.message },
      { status: 500 }
    )
  }
}
