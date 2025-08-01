'use client'

import { useAuth } from '@/components/auth/AuthWrapper'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ChatInterface from './ChatInterface'

export default function ClientChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If not loading and no user, redirect to home
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // If loading, show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to access CactAI</p>
          <button
            onClick={() => router.replace('/')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // Create user profile from auth data
  const userProfile = {
    trees_planted: 0.1234 // Start with small amount for demo
  }

  return (
    <div className="h-screen">
      <ChatInterface 
        userId={user.id} 
        userProfile={userProfile}
      />
    </div>
  )
}