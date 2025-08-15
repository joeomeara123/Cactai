'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createDatabaseClient } from '@/lib/database-client'
import { MODEL_CONFIG, type ModelName } from '@/lib/config-client'
import { 
  Send, TreePine, Sparkles, ChevronDown, 
  User, Bot, Copy, ThumbsUp, ThumbsDown, 
  RotateCcw, Share 
} from 'lucide-react'
import Sidebar from './Sidebar'
import { useToast } from '@/components/ui/Toast'

// Utility to join class names cleanly
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ')

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

// Utility function for formatting trees added in messages
function formatTreesAdded(trees: number): string {
  if (trees >= 0.001) return `+${trees.toFixed(4)} trees planted!`
  if (trees > 0) return `+${(trees * 1000).toFixed(1)} milli-trees planted!`
  return '+Impact recorded!'
}

// Enhanced input validation function
function validateInput(input: string): { isValid: boolean; error?: string } {
  const trimmed = input.trim()
  
  if (!trimmed) {
    return { isValid: false, error: 'Message cannot be empty' }
  }
  
  if (trimmed.length > 1000) {
    return { isValid: false, error: `Message is too long (${trimmed.length}/1000 characters)` }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Message is too short (min 2 characters)' }
  }
  
  // Check for potentially harmful content (basic)
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /onclick=/i,
    /onerror=/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Message contains potentially unsafe content' }
    }
  }
  
  return { isValid: true }
}

export default function ChatInterface({ 
  userId, 
  userProfile 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelName>('gpt-4o-mini')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [totalTrees, setTotalTrees] = useState(userProfile?.trees_planted || 0)
  const [inputError, setInputError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClientSupabaseClient()
  const db = createDatabaseClient(supabase)
  const { showToast, ToastContainer } = useToast()

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
      // Don't show toast for this as it's a background operation
    }
  }, [supabase, userId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize session, refresh tree count, and set up real-time subscriptions
  useEffect(() => {
    const initializeSession = async () => {
      // Only create a session if we don't have one and there are no messages
      if (!currentSession && messages.length === 0) {
        const sessionId = await db.createChatSession(userId, 'New Chat')
        if (sessionId) {
          setCurrentSession(sessionId)
        }
      }
    }

    refreshTreeCount()
    initializeSession()

    // Set up real-time subscription for user profile updates (tree count)
    const profileSubscription = supabase
      .channel('user-profile-changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Real-time profile update:', payload)
          if (payload.new && typeof payload.new.trees_planted === 'number') {
            setTotalTrees(payload.new.trees_planted)
          }
        }
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
    }
  }, [refreshTreeCount, db, userId, currentSession, messages.length, supabase])

  // Ensure session exists (now mostly for edge cases)
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

  // Load messages for a selected session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      console.log('Loading messages for session:', sessionId)
      setIsLoadingMessages(true) // Show specific loading state for message loading
      setMessages([]) // Clear current messages first
      
      // Load messages from database
      const sessionMessages = await db.getSessionMessages(sessionId)
      console.log('Loaded messages:', sessionMessages)
      
      // Convert to our Message interface format
      const formattedMessages: Message[] = sessionMessages.map(msg => {
        const message: Message = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }
        
        if (msg.treesAdded && msg.treesAdded > 0) {
          message.treesAdded = msg.treesAdded
        }
        
        return message
      })
      
      setMessages(formattedMessages)
      showToast('Conversation history loaded', 'success')
    } catch (error) {
      console.error('Failed to load session messages:', error)
      showToast('Failed to load conversation history', 'error')
      setMessages([]) // Ensure we have a clean state on error
    } finally {
      setIsLoadingMessages(false) // Always stop loading state
    }
  }

  const handleSend = async () => {
    if (isLoading) return

    // Validate input
    const validation = validateInput(input)
    if (!validation.isValid) {
      setInputError(validation.error || 'Invalid input')
      return
    }

    const userMessage = input.trim()
    setInput('')
    setInputError(null)
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
      
      // Optimistic tree count update with rollback capability
      if (data.treesAdded && data.treesAdded > 0) {
        console.log(`Adding ${data.treesAdded} trees to counter`) // Debug log
        const previousTreeCount = totalTrees
        
        setTotalTrees(prev => {
          const newTotal = prev + data.treesAdded
          console.log(`Tree count updated: ${prev} -> ${newTotal}`) // Debug log
          return newTotal
        })
        
        // Show success toast for tree planting
        if (data.treesAdded >= 0.001) {
          showToast(`🌱 ${data.treesAdded.toFixed(4)} trees planted!`, 'success')
        }
        
        // Sync with database after a short delay, with fallback on error
        setTimeout(async () => {
          try {
            await refreshTreeCount()
          } catch (syncError) {
            console.error('Failed to sync tree count, rolling back:', syncError)
            // Rollback optimistic tree count update
            setTotalTrees(previousTreeCount)
            showToast('Tree count sync failed, but your impact was recorded', 'warning')
          }
        }, 1500)
      }

    } catch (error) {
      console.error('Chat error:', error)
      
      // Comprehensive rollback of optimistic updates
      setMessages(prev => prev.slice(0, -1)) // Remove user message
      
      // Show error with detailed message
      showToast(
        'Failed to send message. Your message was not saved.',
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInput(newValue)
    
    // Clear error when user starts typing after an error
    if (inputError) {
      setInputError(null)
    }
    
    // Real-time validation for length
    if (newValue.length > 1000) {
      setInputError('Message is too long (max 1000 characters)')
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
    
    // Focus on input after starting new chat for better UX
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Message copied to clipboard!', 'success')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast('Message copied to clipboard!', 'success')
    }
  }

  const handleThumbsUp = async (messageId: string) => {
    try {
      // In a real implementation, you would save this to the database
      // For now, we'll just show user feedback
      console.log('Thumbs up for message:', messageId)
      showToast('👍 Thanks for the positive feedback!', 'success')
      
      // TODO: Add database call like:
      // await db.saveMessageFeedback(messageId, 'positive')
    } catch (error) {
      console.error('Failed to save feedback:', error)
      showToast('Failed to save feedback', 'error')
    }
  }

  const handleThumbsDown = async (messageId: string) => {
    try {
      // In a real implementation, you would save this to the database
      // For now, we'll just show user feedback
      console.log('Thumbs down for message:', messageId)
      showToast('👎 Thanks for the feedback - we\'ll improve!', 'info')
      
      // TODO: Add database call like:
      // await db.saveMessageFeedback(messageId, 'negative')
    } catch (error) {
      console.error('Failed to save feedback:', error)
      showToast('Failed to save feedback', 'error')
    }
  }

  const handleRegenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) {
      showToast('Message not found', 'error')
      return
    }

    // Find the user message before this assistant message
    const userMessageIndex = messageIndex - 1
    const invalidUserMessage = userMessageIndex < 0 || 
      !messages[userMessageIndex] || 
      messages[userMessageIndex].role !== 'user'
    
    if (invalidUserMessage) {
      showToast('Cannot regenerate: no user message found', 'error')
      return
    }

    const userMessage = messages[userMessageIndex]!.content

    // Store original messages for potential rollback
    const originalMessages = [...messages]
    
    // Remove all messages from this point onward  
    setMessages(prev => prev.slice(0, userMessageIndex + 1))
    setIsLoading(true)
    
    showToast('🔄 Regenerating response...', 'info')

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
      
      // Add regenerated assistant message
      const regeneratedMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        treesAdded: data.treesAdded
      }
      
      setMessages(prev => [...prev, regeneratedMsg])
      
      // Optimistic tree count update
      if (data.treesAdded && data.treesAdded > 0) {
        setTotalTrees(prev => prev + data.treesAdded)
        showToast(`✨ Response regenerated! +${data.treesAdded.toFixed(4)} trees`, 'success')
      } else {
        showToast('✨ Response regenerated successfully!', 'success')
      }
      
      // Sync with database after a short delay
      setTimeout(() => refreshTreeCount(), 1500)

    } catch (error) {
      console.error('Regeneration error:', error)
      
      // Rollback to original messages on error
      setMessages(originalMessages)
      
      showToast('Failed to regenerate response. Please try again.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="flex h-screen bg-gray-900">
        {/* Sidebar */}
        <Sidebar 
          totalTrees={totalTrees}
          onNewChat={handleNewChat}
          onSignOut={handleSignOut}
          userId={userId}
          currentSessionId={currentSession}
          onSessionSelect={(sessionId) => {
            setCurrentSession(sessionId)
            loadSessionMessages(sessionId)
          }}
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
                className={cn(
                  "flex items-center gap-2 px-3 py-2 bg-gray-700",
                  "hover:bg-gray-600 rounded-lg transition-colors text-white"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedModel}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showModelDropdown && (
                <div className={cn(
                  "absolute right-0 mt-1 bg-gray-800 border border-gray-600",
                  "rounded-lg shadow-lg z-10 min-w-48"
                )}>
                  {Object.entries(MODEL_CONFIG).map(([modelKey, config]) => (
                    <button
                      key={modelKey}
                      onClick={() => {
                        setSelectedModel(modelKey as ModelName)
                        setShowModelDropdown(false)
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 hover:bg-gray-700",
                        "first:rounded-t-lg last:rounded-b-lg text-white"
                      )}
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
            {isLoadingMessages ? (
              // Loading skeleton for when loading conversation history
              <div className="space-y-6 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    {/* User message skeleton */}
                    <div className="flex gap-4 justify-end">
                      <div className="max-w-2xl w-2/3">
                        <div className="bg-gray-700 rounded-3xl px-4 py-3">
                          <div className="h-4 bg-gray-600 rounded animate-pulse w-full mb-2"></div>
                          <div className="h-4 bg-gray-600 rounded animate-pulse w-3/4"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse flex-shrink-0"></div>
                    </div>
                    
                    {/* Assistant message skeleton */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse flex-shrink-0"></div>
                      <div className="flex-1 max-w-2xl">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-700 rounded animate-pulse w-full"></div>
                          <div className="h-4 bg-gray-700 rounded animate-pulse w-4/5"></div>
                          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/5"></div>
                        </div>
                        <div className="mt-3 px-3 py-2 bg-gray-800 rounded-lg">
                          <div className="h-3 bg-gray-600 rounded animate-pulse w-32"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 && !isLoadingMessages ? (
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
            ) : null}

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
                                  {formatTreesAdded(message.treesAdded)} 🌱
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div 
                          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          role="toolbar"
                          aria-label="Message actions"
                        >
                          <button 
                            onClick={() => copyToClipboard(message.content)}
                            className={cn(
                              "p-1 text-gray-400 hover:text-white transition-colors rounded",
                              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                            )}
                            aria-label="Copy message to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleThumbsUp(message.id)}
                            className={cn(
                              "p-1 text-gray-400 hover:text-green-400 transition-colors rounded",
                              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                            )}
                            aria-label="Rate this response as helpful"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleThumbsDown(message.id)}
                            className={cn(
                              "p-1 text-gray-400 hover:text-red-400 transition-colors rounded",
                              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                            )}
                            aria-label="Rate this response as not helpful"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRegenerateMessage(message.id)}
                            className={cn(
                              "p-1 text-gray-400 hover:text-blue-400 transition-colors rounded",
                              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50",
                              "disabled:opacity-50"
                            )}
                            aria-label={isLoading ? 'Regenerating response...' : 'Regenerate response'}
                            disabled={isLoading}
                          >
                            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div 
                  className="flex gap-4" 
                  role="status" 
                  aria-live="polite" 
                  aria-label="CactAI is generating a response"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 max-w-2xl">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-2/3"></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                      <TreePine className="w-4 h-4" />
                      <span>Calculating environmental impact...</span>
                      <div className="flex gap-1 ml-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce"></div>
                        <div 
                          className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" 
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div 
                          className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" 
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
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
            <div className={cn(
              "relative bg-gray-800 rounded-3xl border transition-colors",
              inputError ? 'border-red-500' : 'border-gray-600'
            )}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Message CactAI..."
                className={cn(
                  "w-full p-4 pr-12 bg-transparent text-white placeholder-gray-400 resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                )}
                rows={1}
                style={{ minHeight: '52px', maxHeight: '120px' }}
                aria-label="Type your message to CactAI"
                aria-describedby="input-error input-counter"
                aria-invalid={inputError ? 'true' : 'false'}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || inputError !== null}
                className={cn(
                  "absolute right-3 bottom-3 p-2 bg-white text-black rounded-full",
                  "hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400",
                  "disabled:cursor-not-allowed transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-green-500"
                )}
                aria-label={isLoading ? 'Sending message...' : 'Send message'}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Error message and character count */}
            <div className="flex justify-between items-center mt-2 text-xs">
              <div 
                id="input-error" 
                className="text-red-400"
                role="alert"
                aria-live="polite"
              >
                {inputError}
              </div>
              <div 
                id="input-counter"
                className={cn(
                  input.length > 900 ? 'text-orange-400' : 
                  input.length > 800 ? 'text-yellow-400' : 'text-gray-500'
                )}
                aria-label={`${input.length} of 1000 characters used`}
              >
                {input.length}/1000
              </div>
            </div>
            
            <div className="text-center mt-2 text-xs text-gray-500">
              CactAI can make mistakes. Check important info. See{' '}
              <button className="underline hover:text-gray-400">Cookie Preferences</button>.
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}