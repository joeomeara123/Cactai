import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 NEW CHAT V2 API - MATH ENABLED')
    
    const body = await request.json()
    console.log('📝 V2 Received body:', body)
    
    // Basic validation
    const { message, model, sessionId, userId } = body
    
    if (!message || !userId || !sessionId) {
      throw new Error('Missing required fields')
    }
    
    // Clean the message and create a proper response
    const cleanMessage = typeof message === 'string' ? message.trim() : String(message).trim()
    console.log('🔍 V2 Clean message:', cleanMessage)
    
    // Generate contextual responses based on the message content
    let response: string
    
    if (cleanMessage.toLowerCase().includes('hello') || cleanMessage.toLowerCase().includes('hi')) {
      response = "Hello! This is the NEW V2 API. I can do math and chat properly!"
    } else if (cleanMessage.match(/^\d+\s*[x×]\s*\d+$/)) {
      // Handle math expressions like "3 x 44532"
      const parts = cleanMessage.split(/\s*[x×]\s*/)
      if (parts.length === 2 && parts[0] && parts[1]) {
        const num1 = parseInt(parts[0])
        const num2 = parseInt(parts[1])
        if (!isNaN(num1) && !isNaN(num2)) {
          const result = num1 * num2
          response = `NEW V2: ${num1} × ${num2} = ${result.toLocaleString()}! 🧮 Math works perfectly!`
        } else {
          response = "V2: I see numbers but couldn't calculate them properly."
        }
      } else {
        response = "V2: I see you're working with numbers!"
      }
    } else {
      response = `NEW V2 API received: "${cleanMessage}" - This is working correctly!`
    }
    
    return NextResponse.json({
      response: response,
      treesAdded: 0.0123,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 0.0001,
      donation: 0.00004,
      model: model || 'gpt-4o-mini',
      responseTimeMs: 100,
      queryId: 'v2-query-' + Date.now(),
      apiVersion: 'V2'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('❌ V2 Chat API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'V2 Chat API failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        apiVersion: 'V2'
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