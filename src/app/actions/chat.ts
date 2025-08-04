'use server'

// Server Action for chat functionality - bypasses API routes entirely
export async function processChatMessage(message: string) {
  try {
    console.log('🔧 Server Action: Processing chat message:', message)
    
    // Simple echo response for now
    const response = `Server Action Response: I received your message "${message}". This is working through Next.js Server Actions instead of API routes!`
    
    return {
      success: true,
      data: {
        response: response,
        treesAdded: 0.001,
        inputTokens: 10,
        outputTokens: 25,
        totalCost: 0.001,
        donation: 0.0004,
        model: 'server-action-test',
        sessionId: 'server-action-session',
        responseTimeMs: 50
      }
    }
  } catch (error) {
    console.error('🔧 Server Action error:', error)
    return {
      success: false,
      error: 'Server action failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }
  }
}