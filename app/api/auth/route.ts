import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Verify NullClaw API key from request
async function verifyNullClawKey(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('x-nullclaw-api-key')
  if (!apiKey) return false

  // Check if this API key exists in any user's profile
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('nullclaw_api_key', apiKey)
    .single()

  return !!data
}

export async function GET(request: NextRequest) {
  // Verify NullClaw API key
  const isValid = await verifyNullClawKey(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ status: 'ok', message: 'NullClaw API is working' })
}
