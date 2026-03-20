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
    .from('profiles')
    .select('id')
    .eq('nullclaw_api_key', apiKey)
    .single()

  return data?.id || null
}

// GET - Fetch calendar events
export async function GET(request: NextRequest) {
  const userId = await getUserFromApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true })

    if (startDate) {
      query = query.gte('event_date', startDate)
    }
    if (endDate) {
      query = query.lte('event_date', endDate)
    }

    const { data: events, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      events: events?.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.event_date,
        duration: event.duration_minutes,
        color: event.color,
      })) || [],
      count: events?.length || 0,
    })
  } catch (error: any) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Create a new calendar event
export async function POST(request: NextRequest) {
  const userId = await getUserFromApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, start, duration = 60, description, color = 'blue' } = body

    if (!title || !start) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      )
    }

    // Parse the start time (ISO 8601 string)
    const startDate = new Date(start)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start time format. Use ISO 8601 format.' },
        { status: 400 }
      )
    }

    // Create the event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        title,
        event_date: startDate.toISOString(),
        description: description || null,
        duration_minutes: duration,
        color,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.event_date,
        duration: event.duration_minutes,
        color: event.color,
      },
    })
  } catch (error: any) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', details: error?.message },
      { status: 500 }
    )
  }
}
