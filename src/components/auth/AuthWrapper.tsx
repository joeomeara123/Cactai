'use client'

import { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthWrapper')
  }
  return context
}

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Memoize the Supabase client to prevent unnecessary re-renders
  const supabase = useMemo(() => createClientSupabaseClient(), [])

  // Get initial session function
  const getInitialSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      setUser(session?.user ?? null)
      setLoading(false)
    } catch (error) {
      console.error('Error getting session:', error)
      setLoading(false)
    }
  }, [supabase.auth])

  useEffect(() => {
    let mounted = true

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Failsafe: Reset loading state after 5 seconds
    const failsafe = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - forcing loading to false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(failsafe)
    }
  }, [supabase.auth, getInitialSession])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ user, loading }), [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}