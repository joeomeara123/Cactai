import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      env_check: {
        supabase_url: supabaseUrl ? 'Present' : 'Missing',
        service_key: supabaseServiceKey ? `Present (${supabaseServiceKey.substring(0, 20)}...)` : 'Missing',
        openai_key: openaiKey ? `Present (${openaiKey.substring(0, 20)}...)` : 'Missing'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Environment test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}