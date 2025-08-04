import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Simple chat API called')
    
    // Parse request
    const body = await request.json()
    const { message, model = 'gpt-4o-mini', sessionId, userId } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('🔧 Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔧 User authenticated:', user.id)

    // Simple mock response for testing
    const mockResponse = `Hello! I received your message: "${message}". This is a test response from the simplified chat API. The database trigger should have created your profile automatically.`
    
    return NextResponse.json({
      response: mockResponse,
      treesAdded: 0.001,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 0.001,
      donation: 0.0004,
      model: model,
      sessionId: sessionId,
      responseTimeMs: 100,
      debug: {
        userId: user.id,
        userEmail: user.email,
        message: "Simplified API working"
      }
    })

  } catch (error) {
    console.error('🔧 Chat API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Chat API is working. Use POST method.' })
}