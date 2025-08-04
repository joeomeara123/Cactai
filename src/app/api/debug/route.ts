import { NextResponse } from 'next/server'

export async function GET() {
  // Simple diagnostic endpoint to check environment setup
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
    openaiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set'
  })
}