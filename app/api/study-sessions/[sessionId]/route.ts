import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import type { StudySessionsUpdate } from '@/lib/types'

// GET - Fetch a single study session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: data,
    })
  } catch (error: any) {
    console.error('Error fetching study session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study session', details: error?.message },
      { status: 500 }
    )
  }
}

// PATCH - Update a study session (e.g., complete it)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const { title, completed_at } = body

    // Build update object with only provided fields
    const updateData: StudySessionsUpdate = {}

    if (title !== undefined) updateData.title = title
    if (completed_at !== undefined) {
      updateData.completed_at = completed_at === null ? null : new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('study_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: data,
    })
  } catch (error: any) {
    console.error('Error updating study session:', error)
    return NextResponse.json(
      { error: 'Failed to update study session', details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a study session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Session deleted',
    })
  } catch (error: any) {
    console.error('Error deleting study session:', error)
    return NextResponse.json(
      { error: 'Failed to delete study session', details: error?.message },
      { status: 500 }
    )
  }
}
