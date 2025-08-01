import { NextRequest, NextResponse } from 'next/server'
import { createChatCompletion, estimateTokenUsage, countStreamTokens } from '@/lib/openai'
import type { ModelName } from '@/lib/config-server'

export async function POST(request: NextRequest) {
  try {
    const { message, model } = await request.json()
    // TODO: Implement sessionId and userId for database tracking
    // const { sessionId, userId } = await request.json()

    // Validate inputs
    if (!message || !model) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // Calculate mock trees added (simplified calculation)
    const treesAdded = (actualInputTokens + actualOutputTokens) * 0.000001 // Mock calculation

    return NextResponse.json({
      response: responseContent,
      treesAdded: treesAdded,
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