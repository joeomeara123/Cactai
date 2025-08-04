import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing environment variables...')
    
    // Check all required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    const status = {
      supabaseUrl: supabaseUrl ? 'configured' : 'missing',
      supabaseServiceKey: supabaseServiceKey ? `configured (${supabaseServiceKey.substring(0, 20)}...)` : 'missing',
      supabaseAnonKey: supabaseAnonKey ? 'configured' : 'missing',
      openaiKey: openaiKey ? 'configured' : 'missing',
      nodeEnv: process.env.NODE_ENV || 'not set',
      timestamp: new Date().toISOString()
    }

    console.log('Environment status:', status)

    return NextResponse.json({
      success: true,
      environment: status,
      message: 'Environment variables test completed'
    })

  } catch (error) {
    console.error('Environment test error:', error)
    return NextResponse.json(
      { 
        error: 'Environment test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}