import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Verify NullClaw API key and get user ID
async function getUserFromApiKey(request: NextRequest): Promise<string | null> {
  const apiKey = request.headers.get('x-nullclaw-api-key')
  if (!apiKey) return null

  const { data } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('nullclaw_api_key', apiKey)
    .single()

  return data?.user_id || null
}

// GET - Fetch all tasks for the user
export async function GET(request: NextRequest) {
  const userId = await getUserFromApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all sections with tasks for this user
    const { data: sections, error } = await supabase
      .from('sections')
      .select(`
        id,
        title,
        column_id,
        tasks (
          id,
          text,
          completed,
          position
        )
      `)
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) throw error

    // Format the response
    const tasks = sections?.flatMap(section =>
      (section.tasks || []).map((task: any) => ({
        id: task.id,
        title: task.text,
        completed: task.completed,
        section: section.title,
        column: section.column_id,
        position: task.position,
      }))
    ) || []

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
    })
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  const userId = await getUserFromApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, section = 'To Do', column = 'col-today' } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Find or create the section
    let { data: sectionData } = await supabase
      .from('sections')
      .select('id, position')
      .eq('user_id', userId)
      .eq('title', section)
      .eq('column_id', column)
      .single()

    if (!sectionData) {
      // Create new section
      const { data: newSection, error: sectionError } = await supabase
        .from('sections')
        .insert({
          user_id: userId,
          title: section,
          column_id: column,
          position: 0,
        })
        .select()
        .single()

      if (sectionError) throw sectionError
      sectionData = newSection
    }

    // Get the max position in this section
    const { data: maxTask } = await supabase
      .from('tasks')
      .select('position')
      .eq('section_id', sectionData.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const newPosition = (maxTask?.position ?? -1) + 1

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        section_id: sectionData.id,
        user_id: userId,
        text: title,
        completed: false,
        position: newPosition,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.text,
        completed: task.completed,
        section: section,
        column,
        position: newPosition,
      },
    })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task', details: error?.message },
      { status: 500 }
    )
  }
}
