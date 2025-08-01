import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
      }
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }
  }

  // Redirect to home page after successful authentication
  // The AuthWrapper will handle redirecting authenticated users to /chat
  return NextResponse.redirect(`${requestUrl.origin}/`)
}