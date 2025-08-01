import { useState, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createDatabaseClient } from '@/lib/database-client'
import type { ModelName } from '@/lib/config-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  treesAdded?: number
}

interface UseChatOptions {
  userId: string
  onTreesUpdate?: (trees: number) => void
}

export function useChat({ userId, onTreesUpdate }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientSupabaseClient()
  const db = createDatabaseClient(supabase)

  const ensureSession = useCallback(async () => {
    if (!currentSession) {
      const sessionId = await db.createChatSession(userId, 'New Chat')
      if (sessionId) {
        setCurrentSession(sessionId)
        return sessionId
      }
    }
    return currentSession
  }, [currentSession, db, userId])

  const sendMessage = useCallback(
    async (content: string, model: ModelName) => {
      if (!content.trim() || isLoading) return

      setIsLoading(true)
      setError(null)

      // Add user message immediately
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        const sessionId = await ensureSession()
        if (!sessionId) throw new Error('Failed to create session')

        // Call API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId,
            model,
            userId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Chat API error')
        }

        const data = await response.json()

        // Add assistant message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          treesAdded: data.treesAdded,
        }

        setMessages((prev) => [...prev, assistantMessage])

        // Update tree count
        if (data.treesAdded > 0 && onTreesUpdate) {
          onTreesUpdate(data.treesAdded)
        }
      } catch (error) {
        console.error('Chat error:', error)
        setError(error instanceof Error ? error.message : 'Unknown error occurred')

        // Add error message
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, ensureSession, userId, onTreesUpdate]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setCurrentSession(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    clearError,
  }
}