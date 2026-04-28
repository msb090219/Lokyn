import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create Supabase client with localStorage support
  // Note: Middleware runs on the server, so we can't access localStorage directly
  // But we configure cookies to work with our client-side localStorage setup
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect to login if accessing dashboard without session
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Note: Authenticated users can now access auth pages for account switching
  // Previously redirected authenticated users away from /auth routes

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
