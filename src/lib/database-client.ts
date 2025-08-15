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
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title || 'New Chat'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating chat session:', error)
      return null
    }

    return data.id
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

  // NEW METHOD: Get messages for a chat session
  async getSessionMessages(sessionId: string): Promise<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    treesAdded?: number
  }>> {
    const { data, error } = await this.supabase
      .from('queries')
      .select('id, user_message, assistant_response, trees_added, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching session messages:', error)
      return []
    }

    // Convert query records to chat messages format
    const messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
      treesAdded?: number
    }> = []

    data?.forEach(query => {
      // Add user message
      messages.push({
        id: `${query.id}-user`,
        role: 'user',
        content: query.user_message,
        timestamp: new Date(query.created_at)
      })

      // Add assistant message
      messages.push({
        id: `${query.id}-assistant`,
        role: 'assistant',
        content: query.assistant_response,
        timestamp: new Date(query.created_at),
        treesAdded: query.trees_added
      })
    })

    return messages
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