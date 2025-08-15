import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { calculateImpact, type ImpactCalculation } from '@/lib/impact'
import type { ModelName } from '@/lib/config'

// Vercel runtime configuration
export const runtime = 'nodejs'
export const maxDuration = 30

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Enhanced request validation
function validateRequest(body: unknown) {
  const req = body as { message?: string; model?: string; sessionId?: string; userId?: string }
  
  if (!req.message || typeof req.message !== 'string') {
    throw new Error('Message is required')
  }
  if (req.message.length > 1000) {
    throw new Error('Message too long')
  }
  if (!req.userId) {
    throw new Error('User ID is required')
  }
  if (!req.sessionId) {
    throw new Error('Session ID is required')
  }
  
  return {
    message: req.message.trim(),
    model: (req.model as ModelName) || 'gpt-4o-mini',
    sessionId: req.sessionId,
    userId: req.userId
  }
}

// Improved token estimation (more accurate than length/4)
function estimateTokens(text: string): number {
  // More accurate token estimation based on OpenAI's general guidelines
  // Average of ~0.75 tokens per word for English text
  const words = text.split(/\s+/).length
  const chars = text.length
  
  // Use word count * 0.75 for longer text, char/4 for shorter text
  if (words > 20) {
    return Math.ceil(words * 0.75)
  } else {
    return Math.ceil(chars / 4)
  }
}

// Save query to database
async function saveQueryToDatabase(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  inputTokens: number,
  outputTokens: number,
  model: ModelName,
  impact: ImpactCalculation & { inputTokens: number; outputTokens: number }
) {
  try {
    const { data, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        session_id: sessionId,
        user_message: userMessage,
        assistant_message: assistantResponse,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_cost: impact.inputCost,
        output_cost: impact.outputCost,
        total_cost: impact.totalCost,
        trees_added: impact.trees,
        donation_amount: impact.donation,
        model_used: model,
        response_time_ms: 0 // Will be updated after response
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to save query to database:', error)
      return null
    }

    // Update user profile with new totals
    await updateUserProfile(userId, impact)

    return data?.id
  } catch (error) {
    console.error('Database operation failed:', error)
    return null
  }
}

// Update user profile with impact
async function updateUserProfile(userId: string, impact: ImpactCalculation & { inputTokens: number; outputTokens: number }) {
  try {
    // Get current user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('total_queries, total_input_tokens, total_output_tokens, total_cost, total_donated, trees_planted')
      .eq('id', userId)
      .single()

    if (profile) {
      // Update with new values
      await supabase
        .from('user_profiles')
        .update({
          total_queries: (profile.total_queries || 0) + 1,
          total_input_tokens: (profile.total_input_tokens || 0) + impact.inputTokens,
          total_output_tokens: (profile.total_output_tokens || 0) + impact.outputTokens,
          total_cost: (profile.total_cost || 0) + impact.totalCost,
          total_donated: (profile.total_donated || 0) + impact.donation,
          trees_planted: (profile.trees_planted || 0) + impact.trees,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    }
  } catch (error) {
    console.error('Failed to update user profile:', error)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🔥 Chat API called successfully')
    
    // Parse and validate request
    const body = await request.json()
    const { message, model, sessionId, userId } = validateRequest(body)
    
    console.log('✅ Request validated, calling OpenAI...', { model, userId, sessionId })
    
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
    
    // Calculate tokens and impact using proper libraries
    const inputTokens = estimateTokens(message)
    const outputTokens = estimateTokens(responseContent)
    
    // Use the proper impact calculation library
    const impact = calculateImpact(inputTokens, outputTokens, model)
    
    console.log('💰 Impact calculated:', {
      inputTokens,
      outputTokens,
      trees: impact.trees,
      cost: impact.totalCost
    })
    
    // Save to database
    const queryId = await saveQueryToDatabase(
      userId,
      sessionId,
      message,
      responseContent,
      inputTokens,
      outputTokens,
      model,
      { ...impact, inputTokens, outputTokens }
    )
    
    if (queryId) {
      console.log('✅ Query saved to database with ID:', queryId)
    } else {
      console.warn('⚠️ Failed to save query to database')
    }
    
    const responseTime = Date.now() - startTime
    
    console.log('✅ Sending successful response with accurate impact')
    
    return NextResponse.json({
      response: responseContent,
      treesAdded: impact.trees,
      inputTokens,
      outputTokens,
      totalCost: impact.totalCost,
      donation: impact.donation,
      model,
      responseTimeMs: responseTime,
      queryId
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