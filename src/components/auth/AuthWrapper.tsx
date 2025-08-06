'use client'

import { useState, useEffect, createContext, useContext, useMemo } from 'react'
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
  const [loading] = useState(false) // Start with false to prevent blocking
  
  // Memoize the Supabase client to prevent unnecessary re-renders
  const supabase = useMemo(() => createClientSupabaseClient(), [])

  useEffect(() => {
    let mounted = true

    // Initialize auth asynchronously without blocking UI
    const initAuth = async () => {
      try {
        console.log('Initializing auth asynchronously...')
        
        // Try to get session (non-blocking)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (error) {
            console.error('Auth session error:', error)
          } else {
            console.log('Auth initialized:', session ? 'User authenticated' : 'No session')
          }
          setUser(session?.user ?? null)
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        setUser(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ user, loading }), [user, loading])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}