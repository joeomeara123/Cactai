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
    
    // Clean the message and create a proper response
    const cleanMessage = typeof message === 'string' ? message.trim() : String(message).trim()
    console.log('🔍 Clean message:', cleanMessage)
    
    // Generate a more natural test response
    const responses = [
      `Thanks for your message! I'm currently in test mode, but I can see you wrote: "${cleanMessage}"`,
      `Hello! I received your message about "${cleanMessage}". The AI system is working correctly.`,
      `Great! Your message "${cleanMessage}" came through successfully. This is a test response while we set up the full AI integration.`,
      `I can see your message: "${cleanMessage}". The chat system is working, and we're planting trees with each conversation!`
    ]
    
    const response = responses[Math.floor(Math.random() * responses.length)]
    
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