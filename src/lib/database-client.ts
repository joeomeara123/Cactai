import { createClientSupabaseClient } from './supabase-client'
import type { User, QueryMetrics, UserImpact, GlobalStats, ChatSession } from '../types'

// Database operations for client components
export class DatabaseClient {
  constructor(private supabase: ReturnType<typeof createClientSupabaseClient>) {}

  // USER OPERATIONS
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user profile:', error)
      return false
    }

    return true
  }

  // CHAT SESSION OPERATIONS
  async createChatSession(userId: string, title?: string): Promise<string | null> {
    try {
      console.log('🔧 Creating chat session for user:', userId)
      
      // First, ensure user profile exists using service role
      await this.ensureUserProfileExists(userId)
      
      // Create the chat session
      const { data, error } = await this.supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: title || 'New Chat'
        })
        .select('id')
        .single()

      if (error) {
        console.error('🔧 Error creating chat session:', {
          error,
          userId,
          title,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        return null
      }

      console.log('🔧 Chat session created successfully:', data.id)
      return data.id
    } catch (error) {
      console.error('🔧 Unexpected error in createChatSession:', error)
      return null
    }
  }

  // Ensure user profile exists by calling our admin endpoint
  private async ensureUserProfileExists(userId: string): Promise<void> {
    try {
      console.log('🔧 Ensuring user profile exists for:', userId)
      
      // Get current session for auth token
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('🔧 No valid session for profile creation:', sessionError)
        throw new Error('No valid session for profile creation')
      }

      const response = await fetch('/api/admin/create-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('🔧 Profile creation result:', result)
        
        if (!result.success) {
          console.error('🔧 Profile creation failed:', result.error)
          throw new Error(`Profile creation failed: ${result.error}`)
        }
      } else {
        const errorText = await response.text()
        console.error('🔧 Profile creation endpoint failed:', response.status, errorText)
        
        let errorDetails = errorText
        try {
          const errorData = JSON.parse(errorText)
          errorDetails = `${errorData.error}${errorData.details ? ': ' + errorData.details : ''}`
        } catch (e) {
          // Keep original error text
        }
        
        throw new Error(`Profile creation endpoint failed (${response.status}): ${errorDetails}`)
      }
    } catch (error) {
      console.error('🔧 Error ensuring profile exists:', error)
      throw error // Re-throw so createChatSession can handle it
    }
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chat sessions:', error)
      return []
    }

    return data || []
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching chat session:', error)
      return null
    }

    return data
  }

  // QUERY OPERATIONS
  async getQueryHistory(userId: string, limit = 50): Promise<QueryMetrics[]> {
    const { data, error } = await this.supabase
      .from('queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching query history:', error)
      return []
    }

    return data?.map(row => ({
      id: row.id,
      user_id: row.user_id,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      input_cost: row.input_cost,
      output_cost: row.output_cost,
      total_cost: row.total_cost,
      trees_added: row.trees_added,
      model: row.model_used,
      created_at: row.created_at
    })) || []
  }

  async getSessionQueries(sessionId: string): Promise<QueryMetrics[]> {
    const { data, error } = await this.supabase
      .from('queries')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching session queries:', error)
      return []
    }

    return data?.map(row => ({
      id: row.id,
      user_id: row.user_id,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      input_cost: row.input_cost,
      output_cost: row.output_cost,
      total_cost: row.total_cost,
      trees_added: row.trees_added,
      model: row.model_used,
      created_at: row.created_at
    })) || []
  }

  // IMPACT & MILESTONE OPERATIONS
  async getUserImpact(userId: string): Promise<UserImpact | null> {
    const { data, error } = await this.supabase
      .rpc('get_user_impact', { user_uuid: userId })

    if (error) {
      console.error('Error fetching user impact:', error)
      return null
    }

    return data
  }

  async getUserMilestones(userId: string): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('user_milestones')
      .select('milestone_trees')
      .eq('user_id', userId)
      .order('milestone_trees', { ascending: true })

    if (error) {
      console.error('Error fetching user milestones:', error)
      return []
    }

    return data?.map(row => row.milestone_trees) || []
  }

  // GLOBAL STATS
  async getGlobalStats(): Promise<GlobalStats | null> {
    const { data, error } = await this.supabase
      .rpc('get_global_stats')

    if (error) {
      console.error('Error fetching global stats:', error)
      return null
    }

    return data
  }
}

// Export convenience function for creating client database instance
export const createDatabaseClient = (supabase: ReturnType<typeof createClientSupabaseClient>) => 
  new DatabaseClient(supabase)

// Default client-side database instance
export const db = new DatabaseClient(createClientSupabaseClient())