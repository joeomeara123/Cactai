import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Count tokens in a text string (approximate)
 * This is a simple approximation - for production use tiktoken library
 */
export function approximateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

/**
 * Create a chat completion with token tracking
 */
export async function createChatCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for MVP to reduce costs
      messages,
      stream: true,
    })

    return completion
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

/**
 * Estimate token usage for messages
 */
export function estimateTokenUsage(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): {
  inputTokens: number
} {
  const inputText = messages.map(m => m.content).join(' ')
  const inputTokens = approximateTokenCount(inputText)
  
  return { inputTokens }
}