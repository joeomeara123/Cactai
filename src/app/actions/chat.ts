'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

// Server Action for chat functionality - bypasses API routes entirely
export async function processChatMessage(message: string) {
  try {
    console.log('🔧 Server Action: Processing chat message:', message)
    
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
    
    // For now, create a smart response based on the message
    let response = ''
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = `Hello! 👋 I'm CactAI, and I'm excited to chat with you while helping plant trees! Your message "${message}" is contributing to reforestation efforts. What would you like to talk about?`
    } else if (lowerMessage.includes('tree') || lowerMessage.includes('forest') || lowerMessage.includes('environment')) {
      response = `🌳 Great question about trees and the environment! "${message}" - Every conversation we have helps fund tree planting initiatives. Did you know that forests absorb about 2.6 billion tons of CO2 annually? What specific environmental topic interests you most?`
    } else if (lowerMessage.includes('how') && lowerMessage.includes('work')) {
      response = `Here's how CactAI works: Every time you chat with me, a small portion of the processing cost (about £0.016 per query) goes directly to tree planting organizations. Your message "${message}" just contributed to planting approximately 0.04 trees! It's like Ecosia, but for AI conversations. 🌱`
    } else {
      response = `Thanks for your message: "${message}"! 🤖 I'm CactAI, and while I process your question, I'm also helping plant trees through our social good initiative. Each conversation contributes to reforestation efforts worldwide. Here's my response: This is a working Server Action implementation that bypasses API route issues completely!`
    }
    
    // Simulate realistic metrics
    const inputTokens = Math.ceil(message.length / 4) // Rough approximation
    const outputTokens = Math.ceil(response.length / 4)
    const totalCost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000 // GPT-4o-mini pricing
    const treesAdded = totalCost * 0.4 * 2.5 // 40% donation rate * 2.5 trees per £
    
    return {
      success: true,
      data: {
        response: response,
        treesAdded: Math.max(treesAdded, 0.001), // Minimum 0.001 trees
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalCost: totalCost,
        donation: totalCost * 0.4,
        model: 'server-action-cactai',
        sessionId: 'server-action-session',
        responseTimeMs: 200 + Math.random() * 300,
        userId: user.id,
        userEmail: user.email
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