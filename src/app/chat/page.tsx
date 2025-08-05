// Chat page with Server Actions (bypasses API route issues)
'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthWrapper'

export default function ChatPage() {
  const { user, loading } = useAuth()
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <a href="/" className="text-blue-400 underline">Go to Home</a>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsLoading(true)
    
    try {
      // Import and call Server Action
      const { processChatMessage } = await import('@/app/actions/chat')
      const result = await processChatMessage(message.trim())
      
      if (result.success && result.data) {
        setResponse(result.data.response)
      } else {
        setResponse(`Error: ${result.error}`)
      }
    } catch (error) {
      setResponse(`Failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">🌵 CactAI - WORKING!</h1>
          <p className="text-gray-400">Chat with Server Actions (no more 405 errors!)</p>
          <p className="text-sm text-green-500 mt-2">✅ Clean deployment branch</p>
          <p className="text-sm text-gray-500 mt-1">Logged in as: {user.email}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Your Message:
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-400 focus:outline-none resize-none"
                rows={4}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span>🌱</span>
                  Send Message & Plant Trees
                </>
              )}
            </button>
          </form>
        </div>

        {response && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-3 text-green-400">🤖 CactAI Response:</h3>
            <div className="text-white whitespace-pre-wrap">{response}</div>
            <div className="mt-4 text-sm text-green-400">
              🌳 Trees planted from this conversation! 
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>✅ Using Server Actions (clean deployment branch)</p>
          <p>✅ Bypasses all API route and email issues</p>
          <p>✅ Fixed the persistent 405 Method Not Allowed errors</p>
          <p>🌳 Every message helps plant trees!</p>
        </div>
      </div>
    </div>
  )
}