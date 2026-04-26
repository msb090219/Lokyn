import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Add tasks to an existing session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const { task_ids } = await request.json()

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json(
        { error: 'task_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('study_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current max position
    const { data: existingTasks } = await supabase
      .from('session_tasks')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingTasks && existingTasks.length > 0 ? existingTasks[0].position : -1

    // Insert new tasks
    const newTasks = task_ids.map((taskId: string, index: number) => ({
      session_id: sessionId,
      task_id: taskId,
      position: maxPosition + 1 + index,
      completed: false,
    }))

    const { data, error } = await supabase
      .from('session_tasks')
      .insert(newTasks)
      .select('*, task(id, text)')

    if (error) throw error

    return NextResponse.json({
      success: true,
      tasks: data,
    })
  } catch (error: any) {
    console.error('Error adding tasks to session:', error)
    return NextResponse.json(
      { error: 'Failed to add tasks to session', details: error?.message },
      { status: 500 }
    )
  }
}
