'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createDatabaseClient } from '@/lib/database-client'
import { MODEL_CONFIG, type ModelName } from '@/lib/config-client'
import { Send, TreePine, Sparkles, ChevronDown, User, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw, Share } from 'lucide-react'
import Sidebar from './Sidebar'

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientSupabaseClient()
  const db = createDatabaseClient(supabase)

  // Function to refresh user's tree count from database
  const refreshTreeCount = useCallback(async () => {
    try {
      console.log('Refreshing tree count from database...') // Debug log
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('trees_planted')
        .eq('id', userId)
        .single()
      
      if (!error && profile) {
        console.log(`Database tree count: ${profile.trees_planted}`) // Debug log
        setTotalTrees(profile.trees_planted || 0)
      } else {
        console.error('Error fetching tree count from database:', error)
      }
    } catch (error) {
      console.error('Failed to refresh tree count:', error)
    }
  }, [supabase, userId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Refresh tree count on component mount
  useEffect(() => {
    refreshTreeCount()
  }, [refreshTreeCount])

  // Ensure user profile exists on component mount
  useEffect(() => {
    ensureUserProfile()
  }, [userId])

  // Create new session on first message
  const ensureSession = async () => {
    console.log('🔧 ensureSession called, currentSession:', currentSession)
    
    if (!currentSession) {
      console.log('🔧 No existing session, creating new one...')
      
      // First, ensure user profile exists
      console.log('🔧 Calling ensureUserProfile...')
      const profileExists = await ensureUserProfile()
      console.log('🔧 ensureUserProfile result:', profileExists)
      
      if (!profileExists) {
        console.error('🔧 Profile creation failed, throwing error')
        throw new Error('Cannot create session: User profile creation failed')
      }
      
      console.log('🔧 Profile exists, creating chat session...')
      const sessionId = await db.createChatSession(userId, 'New Chat')
      console.log('🔧 createChatSession result:', sessionId)
      
      if (sessionId) {
        setCurrentSession(sessionId)
        console.log('🔧 Session created successfully:', sessionId)
        return sessionId
      } else {
        console.error('🔧 Session creation returned null')
        throw new Error('Failed to create chat session in database')
      }
    }
    
    console.log('🔧 Using existing session:', currentSession)
    return currentSession
  }

  // Ensure user profile exists using server-side admin endpoint
  const ensureUserProfile = async () => {
    try {
      console.log('🔧 ensureUserProfile: Starting profile creation process...')

      // Get the session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('No valid session for profile creation:', sessionError)
        return false
      }

      console.log('Using access token for profile creation:', session.access_token?.substring(0, 20) + '...')

      // Call the admin endpoint to create/verify profile
      const response = await fetch('/api/admin/create-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Profile creation endpoint response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Profile creation endpoint failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        try {
          const errorData = JSON.parse(errorText)
          console.error('Parsed error data:', errorData)
        } catch (e) {
          console.error('Could not parse error response as JSON')
        }
        
        return false
      }

      const result = await response.json()
      console.log('Profile creation result:', result)

      if (result.success) {
        console.log('User profile ensured successfully')
        return true
      } else {
        console.error('Profile creation failed:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error calling profile creation endpoint:', error)
      return false
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Check if user is authenticated
    if (!userId) {
      console.error('User not authenticated')
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Please sign in to start chatting.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      return
    }

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

      // Use Server Action instead of API route (bypasses 405 errors)
      const { processChatMessage } = await import('@/app/actions/chat')
      const result = await processChatMessage(userMessage)

      if (!result.success) {
        console.error('Server Action Error:', result.error)
        throw new Error(`Server Action error: ${result.error}`)
      }

      const data = result.data
      console.log('API Response data:', data) // Debug log
      
      // Add assistant message
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        treesAdded: data.treesAdded
      }
      
      setMessages(prev => [...prev, assistantMsg])
      
      // Update tree count immediately with the response data
      if (data.treesAdded && data.treesAdded > 0) {
        console.log(`Adding ${data.treesAdded} trees to counter`) // Debug log
        setTotalTrees(prev => {
          const newTotal = prev + data.treesAdded
          console.log(`Tree count updated: ${prev} -> ${newTotal}`) // Debug log
          return newTotal
        })
      } else {
        console.log('No trees added in this response:', data.treesAdded) // Debug log
      }
      
      // Also refresh tree count from database to ensure accuracy
      setTimeout(() => refreshTreeCount(), 1000)

    } catch (error) {
      console.error('Chat error:', error)
      
      // Determine more specific error message
      let errorMessage = 'Sorry, something went wrong. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('Chat API error')) {
          errorMessage = 'Unable to connect to AI service. Please check your connection and try again.'
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.'
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication error. Please try signing in again.'
        }
        console.error('Detailed error:', error.message)
      }
      
      // Add error message
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage,
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

  const handleNewChat = () => {
    setMessages([])
    setCurrentSession(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        totalTrees={totalTrees}
        onNewChat={handleNewChat}
        onSignOut={handleSignOut}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">CactAI 4o</h2>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedModel}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showModelDropdown && (
                <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                  {Object.entries(MODEL_CONFIG).map(([modelKey, config]) => (
                    <button
                      key={modelKey}
                      onClick={() => {
                        setSelectedModel(modelKey as ModelName)
                        setShowModelDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-white"
                    >
                      <div className="font-medium">{modelKey}</div>
                      <div className="text-xs text-gray-400">
                        Input: ${config.inputCostPer1K}/1K • Output: ${config.outputCostPer1K}/1K
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4">
            {messages.length === 0 && (
              <div className="text-center py-32">
                <div className="mb-8">
                  <TreePine className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    What can I help with?
                  </h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Ask me anything and watch your tree counter grow. Every conversation helps reforest our planet! 🌱
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-6 py-4">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  {message.role === 'user' ? (
                    <div className="flex gap-4 justify-end">
                      <div className="max-w-2xl">
                        <div className="bg-gray-700 text-white rounded-3xl px-4 py-3">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 max-w-2xl">
                        <div className="text-white mb-2">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          {message.treesAdded && message.treesAdded > 0 && (
                            <div className="mt-3 px-3 py-2 bg-green-900/30 rounded-lg border border-green-700">
                              <div className="text-sm text-green-400 flex items-center gap-2">
                                <TreePine className="w-4 h-4" />
                                <span>
                                  {message.treesAdded >= 0.001 
                                    ? `+${message.treesAdded.toFixed(4)} trees planted!`
                                    : message.treesAdded > 0
                                    ? `+${(message.treesAdded * 1000).toFixed(1)} milli-trees planted!`
                                    : '+Impact recorded!'
                                  } 🌱
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => copyToClipboard(message.content)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Copy"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-white transition-colors" title="Good response">
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-white transition-colors" title="Bad response">
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-white transition-colors" title="Regenerate">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-white">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div ref={messagesEndRef} />
          </div>
      </div>

        {/* Input */}
        <div className="border-t border-gray-700 bg-gray-900 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-gray-800 rounded-3xl border border-gray-600">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message CactAI..."
                className="w-full p-4 pr-12 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none"
                rows={1}
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 bg-white text-black rounded-full hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-center mt-3 text-xs text-gray-500">
              CactAI can make mistakes. Check important info. See{' '}
              <button className="underline hover:text-gray-400">Cookie Preferences</button>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}