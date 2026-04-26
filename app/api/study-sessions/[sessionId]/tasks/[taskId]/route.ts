import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH - Update task completion status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; taskId: string }> }
) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, taskId } = await params
    const { completed } = await request.json()

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'completed must be a boolean' },
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

    // Update the session task
    const { data, error } = await supabase
      .from('session_tasks')
      .update({ completed })
      .eq('id', taskId)
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      task: data,
    })
  } catch (error: any) {
    console.error('Error updating session task:', error)
    return NextResponse.json(
      { error: 'Failed to update session task', details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove task from session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; taskId: string }> }
) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, taskId } = await params

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

    // Delete the session task
    const { error } = await supabase
      .from('session_tasks')
      .delete()
      .eq('id', taskId)
      .eq('session_id', sessionId)

    if (error) throw error

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Error removing session task:', error)
    return NextResponse.json(
      { error: 'Failed to remove session task', details: error?.message },
      { status: 500 }
    )
  }
}
