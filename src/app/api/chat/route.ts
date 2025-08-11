import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Vercel runtime configuration
export const runtime = 'nodejs'
export const maxDuration = 30

// Simple request validation
function validateRequest(body: unknown) {
  const req = body as { message?: string; model?: string; sessionId?: string; userId?: string }
  
  if (!req.message || typeof req.message !== 'string') {
    throw new Error('Message is required')
  }
  if (req.message.length > 1000) {
    throw new Error('Message too long')
  }
  return {
    message: req.message.trim(),
    model: req.model || 'gpt-4o-mini',
    sessionId: req.sessionId || null,
    userId: req.userId || null
  }
}

// Simple token estimation
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Simple impact calculation
function calculateImpact(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens * 0.00015) / 1000  // $0.15 per 1M tokens
  const outputCost = (outputTokens * 0.0006) / 1000  // $0.60 per 1M tokens
  const totalCost = inputCost + outputCost
  const donation = totalCost * 0.4  // 40% donated
  const trees = donation * 2.5      // £1 = 2.5 trees
  
  return {
    trees: Math.max(trees, 0.001),
    totalCost,
    donation
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔥 Chat API called successfully')
    
    // Parse and validate request
    const body = await request.json()
    const { message, model } = validateRequest(body)
    
    console.log('✅ Request validated, calling OpenAI...')
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    // Create completion
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are CactAI, an AI assistant that helps plant trees through conversations. Be helpful and occasionally mention how questions contribute to reforestation.'
        },
        {
          role: 'user', 
          content: message
        }
      ],
      max_tokens: 500
    })
    
    const responseContent = completion.choices[0]?.message?.content || 'Sorry, no response generated.'
    
    console.log('✅ OpenAI response received')
    
    // Calculate tokens and impact
    const inputTokens = estimateTokens(message)
    const outputTokens = estimateTokens(responseContent)
    const impact = calculateImpact(inputTokens, outputTokens)
    
    const responseTime = Date.now() - startTime
    
    console.log('✅ Sending successful response')
    
    return NextResponse.json({
      response: responseContent,
      treesAdded: impact.trees,
      inputTokens,
      outputTokens,
      totalCost: impact.totalCost,
      donation: impact.donation,
      model,
      responseTimeMs: responseTime
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ Chat API Error:', error)
    
    let errorMessage = 'Sorry, something went wrong. Please try again.'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI service configuration error'
        statusCode = 503
      } else if (error.message.includes('Message')) {
        errorMessage = error.message
        statusCode = 400
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        responseTimeMs: responseTime
      },
      { 
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

// Handle CORS preflight
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