import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createChatCompletion, estimateTokenUsage, countStreamTokens } from '@/lib/openai'
import { createDatabaseClient } from '@/lib/database'
import type { ModelName } from '@/lib/config-server'

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, model, userId } = await request.json()

    // Validate inputs
    if (!message || !sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user auth
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create database client
    const dbClient = createDatabaseClient(supabase)

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: `You are CactAI, an AI assistant that helps plant trees through conversations. 
        Be helpful, friendly, and occasionally mention how the user's questions are contributing to reforestation efforts.
        Keep responses concise but informative.`
      },
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Estimate input tokens
    const { inputTokens: estimatedInput } = estimateTokenUsage(messages, model as ModelName)

    // Create completion
    const completion = await createChatCompletion(messages, model as ModelName)

    // Stream and collect response
    let responseContent = ''
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      responseContent += content
    }

    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Count actual tokens
    const actualInputTokens = estimatedInput // We'll use our estimate for now
    const actualOutputTokens = countStreamTokens(responseContent, model as ModelName)

    // Record the query in database
    const queryMetrics = await dbClient.recordQuery({
      userId,
      sessionId,
      userMessage: message,
      assistantMessage: responseContent,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      model: model as ModelName
    })

    if (!queryMetrics) {
      console.error('Failed to record query metrics')
    }

    return NextResponse.json({
      response: responseContent,
      treesAdded: queryMetrics?.trees_added || 0,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      model
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}