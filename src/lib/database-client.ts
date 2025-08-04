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
      // First check if user profile exists
      const { data: userExists, error: userCheckError } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (userCheckError || !userExists) {
        console.warn('User profile not found, attempting to create:', userId)
        
        // Try to get user info from auth and create profile
        const { data: { user }, error: authError } = await this.supabase.auth.getUser()
        
        if (authError || !user || user.id !== userId) {
          console.error('Cannot create profile - user not authenticated or ID mismatch:', { authError, userId, authUserId: user?.id })
          return null
        }

        // Create user profile
        const { error: profileError } = await this.supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null
          })

        if (profileError) {
          console.error('Failed to create user profile:', profileError)
          return null
        }

        console.log('User profile created successfully for:', userId)
      }

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
        console.error('Error creating chat session:', {
          error,
          userId,
          title,
          code: error.code,
          message: error.message,
          details: error.details
        })
        return null
      }

      console.log('Chat session created successfully:', data.id)
      return data.id
    } catch (error) {
      console.error('Unexpected error in createChatSession:', error)
      return null
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