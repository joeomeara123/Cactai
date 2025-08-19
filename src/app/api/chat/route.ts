import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Chat API called successfully')
    
    const body = await request.json()
    console.log('📝 Received body:', body)
    
    // Basic validation
    const { message, model, sessionId, userId } = body
    
    if (!message || !userId || !sessionId) {
      throw new Error('Missing required fields')
    }
    
    // Simulate a simple response
    const response = `Hello! You said: "${message}". This is a test response from the chat API.`
    
    return NextResponse.json({
      response: response,
      treesAdded: 0.0123,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 0.0001,
      donation: 0.00004,
      model: model || 'gpt-4o-mini',
      responseTimeMs: 100,
      queryId: 'test-query-123'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('❌ Chat API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Chat API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}