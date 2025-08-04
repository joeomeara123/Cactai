import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body
    
    return NextResponse.json({
      response: `Echo: ${message || 'No message received'}`,
      treesAdded: 0.001,
      inputTokens: 5,
      outputTokens: 10,
      totalCost: 0.001,
      donation: 0.0004,
      model: 'test-model',
      sessionId: 'test-session',
      responseTimeMs: 50,
      status: 'Simple chat API working without dependencies'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple chat API is running. Use POST to send messages.',
    status: 'working'
  })
}