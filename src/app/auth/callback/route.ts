import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DatabaseClient } from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Create or get user profile
      const db = new DatabaseClient(supabase as any)
      await db.getOrCreateUserProfile({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      })
    }
  }

  // Redirect to home page after successful authentication
  return NextResponse.redirect(`${requestUrl.origin}/`)
}