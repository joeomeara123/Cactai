import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Chat API called successfully - Latest Version v2.1')
    
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
    
    // Generate contextual responses based on the message content
    let response: string
    
    if (cleanMessage.toLowerCase().includes('hello') || cleanMessage.toLowerCase().includes('hi')) {
      response = "Hello! Welcome to CactAI. I'm currently running in test mode, but I can chat with you and we'll plant trees together!"
    } else if (cleanMessage.toLowerCase().includes('how') && cleanMessage.toLowerCase().includes('work')) {
      response = "Great question! CactAI works by using AI conversations to generate funds for environmental causes. Every message we exchange helps plant trees!"
    } else if (cleanMessage.toLowerCase().includes('tree')) {
      response = "I love talking about trees! 🌳 With every conversation, we're contributing to reforestation efforts. Each message plants approximately 0.0123 trees!"
    } else if (cleanMessage.match(/^\d+\s*[x×]\s*\d+$/)) {
      // Handle math expressions like "3 x 44532"
      const parts = cleanMessage.split(/\s*[x×]\s*/)
      if (parts.length === 2 && parts[0] && parts[1]) {
        const num1 = parseInt(parts[0])
        const num2 = parseInt(parts[1])
        if (!isNaN(num1) && !isNaN(num2)) {
          const result = num1 * num2
          response = `I see you're doing some math! ${num1} × ${num2} = ${result.toLocaleString()}. Math and environmental conservation both require careful calculation! 🧮`
        } else {
          response = "I see you're working with numbers! That's great - precision is important in both math and environmental science."
        }
      } else {
        response = "I see you're working with numbers! That's great - precision is important in both math and environmental science."
      }
    } else {
      // General responses for other messages
      const responses = [
        "That's interesting! I'm currently in test mode, but I'm learning from our conversation and planting trees at the same time.",
        "Thank you for chatting with me! Every message helps support environmental causes through CactAI.",
        "I appreciate your message! While I'm in test mode, our conversation is still making a positive environmental impact.",
        "Great to hear from you! CactAI is working to combine AI conversations with environmental action."
      ]
      const randomIndex = Math.floor(Math.random() * responses.length)
      response = responses[randomIndex] || "Thank you for chatting with CactAI!"
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