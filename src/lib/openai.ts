import OpenAI from 'openai'
import { encoding_for_model } from 'tiktoken'
import { serverConfig, MODEL_CONFIG, type ModelName } from './config-server'

// Initialize OpenAI with validated config
export const openai = new OpenAI({
  apiKey: serverConfig.OPENAI_API_KEY,
})

// Custom error types
export class OpenAIError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'OpenAIError'
  }
}

export class TokenCountError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'TokenCountError'
  }
}

/**
 * Accurately count tokens using tiktoken
 */
export function countTokens(text: string, model: ModelName = 'gpt-4o-mini'): number {
  try {
    // Map our model names to tiktoken model names
    const tiktokenModel = model === 'gpt-4o-mini' ? 'gpt-4o' : model
    const encoding = encoding_for_model(tiktokenModel as 'gpt-4o' | 'gpt-4')
    const tokens = encoding.encode(text)
    encoding.free()
    return tokens.length
  } catch (error) {
    throw new TokenCountError(`Failed to count tokens for model ${model}`, error)
  }
}

/**
 * Calculate cost for token usage
 */
export function calculateTokenCost(
  inputTokens: number, 
  outputTokens: number, 
  model: ModelName = 'gpt-4o-mini'
): {
  inputCost: number
  outputCost: number
  totalCost: number
} {
  const modelConfig = MODEL_CONFIG[model]
  const inputCost = (inputTokens / 1000) * modelConfig.inputCostPer1K
  const outputCost = (outputTokens / 1000) * modelConfig.outputCostPer1K
  const totalCost = inputCost + outputCost
  
  return {
    inputCost: parseFloat(inputCost.toFixed(6)),
    outputCost: parseFloat(outputCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6))
  }
}

/**
 * Create a chat completion with proper error handling
 */
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  model: ModelName = 'gpt-4o-mini'
) {
  try {
    // Validate messages
    if (!messages || messages.length === 0) {
      throw new OpenAIError('Messages array cannot be empty')
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
    })

    return completion
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(`OpenAI API error: ${error.message}`, error)
    }
    throw new OpenAIError('Failed to create chat completion', error)
  }
}

/**
 * Estimate token usage for messages with proper type safety
 */
export function estimateTokenUsage(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  model: ModelName = 'gpt-4o-mini'
): {
  inputTokens: number
  estimatedOutputTokens: number
} {
  try {
    // Handle null/undefined content safely
    const inputText = messages
      .map(m => {
        if (typeof m.content === 'string') {
          return m.content
        }
        if (Array.isArray(m.content)) {
          // Handle multi-modal content (text + images)
          return m.content
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join(' ')
        }
        return ''
      })
      .join(' ')
    
    const inputTokens = countTokens(inputText, model)
    
    // Rough estimate: output is typically 20-50% of input length
    const estimatedOutputTokens = Math.ceil(inputTokens * 0.3)
    
    return { inputTokens, estimatedOutputTokens }
  } catch (error) {
    throw new TokenCountError('Failed to estimate token usage', error)
  }
}

/**
 * Count tokens in a streaming response
 */
export function countStreamTokens(content: string, model: ModelName = 'gpt-4o-mini'): number {
  return countTokens(content, model)
}