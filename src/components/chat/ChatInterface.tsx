'use client'

import { useState, useRef, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createDatabaseClient } from '@/lib/database-client'
import { MODEL_CONFIG, type ModelName } from '@/lib/config-client'
import { Send, TreePine, Sparkles, ChevronDown, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  treesAdded?: number
}

interface ChatInterfaceProps {
  userId: string
  userProfile: {
    trees_planted?: number
  }
}

export default function ChatInterface({ userId, userProfile }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelName>('gpt-4o-mini')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [totalTrees, setTotalTrees] = useState(userProfile?.trees_planted || 0)
  const [recentTreesAdded, setRecentTreesAdded] = useState(0)
  const [showTreeAnimation, setShowTreeAnimation] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientSupabaseClient()
  const db = createDatabaseClient(supabase)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Create new session on first message
  const ensureSession = async () => {
    if (!currentSession) {
      const sessionId = await db.createChatSession(userId, 'New Chat')
      if (sessionId) {
        setCurrentSession(sessionId)
        return sessionId
      }
    }
    return currentSession
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to UI immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const sessionId = await ensureSession()
      if (!sessionId) throw new Error('Failed to create session')

      // Call API route for OpenAI completion
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          model: selectedModel,
          userId
        })
      })

      if (!response.ok) throw new Error('Chat API error')

      const data = await response.json()
      
      // Add assistant message
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        treesAdded: data.treesAdded
      }
      
      setMessages(prev => [...prev, assistantMsg])
      
      // Update tree count with animation
      if (data.treesAdded > 0) {
        setRecentTreesAdded(data.treesAdded)
        setTotalTrees(prev => prev + data.treesAdded)
        setShowTreeAnimation(true)
        setTimeout(() => setShowTreeAnimation(false), 2000)
      }

    } catch (error) {
      console.error('Chat error:', error)
      // Add error message
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with Tree Counter and Model Selector */}
      <div className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          {/* Tree Counter */}
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
            <TreePine className={`w-5 h-5 text-green-600 ${showTreeAnimation ? 'animate-bounce' : ''}`} />
            <span className="font-semibold text-green-800">
              {totalTrees.toFixed(4)} trees planted
            </span>
            {showTreeAnimation && (
              <span className="text-green-600 animate-pulse">
                +{recentTreesAdded.toFixed(4)}
              </span>
            )}
          </div>
          
          {/* Progress to next whole tree */}
          <div className="text-sm text-gray-600">
            {(1 - (totalTrees % 1)).toFixed(4)} trees to next milestone
          </div>
        </div>

        {/* Model Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{selectedModel}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showModelDropdown && (
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-48">
              {Object.entries(MODEL_CONFIG).map(([modelKey, config]) => (
                <button
                  key={modelKey}
                  onClick={() => {
                    setSelectedModel(modelKey as ModelName)
                    setShowModelDropdown(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="font-medium">{modelKey}</div>
                  <div className="text-xs text-gray-500">
                    Input: ${config.inputCostPer1K}/1K • Output: ${config.outputCostPer1K}/1K
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <TreePine className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Start Growing Your Forest! 🌱
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ask me anything and watch your tree counter grow. Every conversation helps reforest our planet!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-green-600" />
              </div>
            )}
            
            <div
              className={`max-w-2xl px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.treesAdded && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <TreePine className="w-3 h-3" />
                  +{message.treesAdded.toFixed(4)} trees planted
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-green-600" />
            </div>
            <div className="bg-white border shadow-sm px-4 py-2 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... 🌱"
              className="w-full p-3 pr-12 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 p-2 text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="text-center mt-2 text-xs text-gray-500">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}