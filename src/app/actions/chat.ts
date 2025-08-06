'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createChatCompletion, countTokens, estimateTokenUsage, OpenAIError } from '@/lib/openai'
import { calculateImpact } from '@/lib/impact'
import { DatabaseClient } from '@/lib/database'
import { type ModelName } from '@/lib/config-server'

// Server Action for chat functionality with full OpenAI integration
export async function processChatMessage(message: string, model: ModelName = 'gpt-4o-mini', sessionId?: string) {
  const startTime = Date.now()
  
  try {
    console.log('🔧 Server Action: Processing chat message with AI integration')
    
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }
    
    console.log('🔧 Server Action: User authenticated:', user.id)
    
    // Initialize database client
    const db = new DatabaseClient(supabase)
    
    // Ensure session exists
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const newSessionId = await db.createChatSession(user.id, 'New Chat')
      if (!newSessionId) {
        throw new Error('Failed to create chat session')
      }
      currentSessionId = newSessionId
    }
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: `You are CactAI, an AI assistant that helps plant trees through conversations. Every query costs money, and 40% of that cost goes to reforestation efforts. Be helpful, informative, and occasionally mention the environmental impact of our conversation. Keep responses concise but informative.`
      },
      {
        role: 'user' as const,
        content: message
      }
    ]
    
    // Estimate token usage for cost calculation
    const { inputTokens: estimatedInputTokens } = estimateTokenUsage(messages, model)
    
    console.log(`🔧 Estimated input tokens: ${estimatedInputTokens} for model: ${model}`)
    
    // Create OpenAI chat completion
    const completion = await createChatCompletion(messages, model)
    
    // Process streaming response
    let assistantResponse = ''
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      assistantResponse += content
    }
    
    if (!assistantResponse.trim()) {
      throw new OpenAIError('Empty response from OpenAI')
    }
    
    console.log('🔧 OpenAI response received, length:', assistantResponse.length)
    
    // Count actual tokens used
    const actualInputTokens = countTokens(messages.map(m => m.content).join(' '), model)
    const actualOutputTokens = countTokens(assistantResponse, model)
    
    console.log(`🔧 Actual tokens - Input: ${actualInputTokens}, Output: ${actualOutputTokens}`)
    
    // Calculate environmental impact
    const impact = calculateImpact(actualInputTokens, actualOutputTokens, model)
    
    console.log('🔧 Impact calculation:', impact)
    
    // Record query in database
    const queryRecord = await db.recordQuery({
      userId: user.id,
      sessionId: currentSessionId,
      userMessage: message,
      assistantMessage: assistantResponse,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      model: model
    })
    
    if (!queryRecord) {
      console.warn('🔧 Failed to record query in database, but continuing...')
    } else {
      console.log('🔧 Query recorded successfully in database')
    }
    
    const responseTime = Date.now() - startTime
    
    return {
      success: true,
      data: {
        response: assistantResponse,
        treesAdded: impact.trees,
        inputTokens: actualInputTokens,
        outputTokens: actualOutputTokens,
        totalCost: impact.totalCost,
        donation: impact.donation,
        model: model,
        sessionId: currentSessionId,
        responseTimeMs: responseTime,
        userId: user.id,
        userEmail: user.email
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('🔧 Server Action error:', error)
    
    // Provide specific error messages based on error type
    let errorMessage = 'Sorry, something went wrong. Please try again.'
    
    if (error instanceof OpenAIError) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.'
    } else if (error instanceof Error) {
      if (error.message.includes('Failed to create chat session')) {
        errorMessage = 'Unable to create chat session. Please try refreshing the page.'
      } else if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication error. Please sign in again.'
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      responseTimeMs: responseTime
    }
  }
}