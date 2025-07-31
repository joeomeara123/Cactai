import { createClientSupabaseClient, createServerSupabaseClient } from './supabase'
import { calculateImpact, checkMilestone, type Milestone } from './impact'
import type { User, QueryMetrics, UserImpact, GlobalStats, ChatSession } from '../types'
import type { ModelName } from './config'

// Database client for client components
export const getClientDb = () => createClientSupabaseClient()

// Database client for server components  
export const getServerDb = async () => await createServerSupabaseClient()

// Database operations
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
  async recordQuery(params: {
    userId: string
    sessionId: string
    userMessage: string
    assistantMessage: string
    inputTokens: number
    outputTokens: number
    model: ModelName
  }): Promise<QueryMetrics | null> {
    const { userId, sessionId, userMessage, assistantMessage, inputTokens, outputTokens, model } = params

    // Calculate impact
    const impact = calculateImpact(inputTokens, outputTokens, model)

    const queryData = {
      user_id: userId,
      session_id: sessionId,
      user_message: userMessage,
      assistant_message: assistantMessage,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model_used: model,
      input_cost: impact.inputCost,
      output_cost: impact.outputCost,
      total_cost: impact.totalCost,
      donation_amount: impact.donation,
      trees_added: impact.trees,
    }

    const { data, error } = await this.supabase
      .from('queries')
      .insert(queryData)
      .select('*')
      .single()

    if (error) {
      console.error('Error recording query:', error)
      return null
    }

    // Check for milestones (async, don't wait)
    this.checkUserMilestones(userId).catch(console.error)

    return {
      id: data.id,
      user_id: data.user_id,
      input_tokens: data.input_tokens,
      output_tokens: data.output_tokens,
      input_cost: data.input_cost,
      output_cost: data.output_cost,
      total_cost: data.total_cost,
      trees_added: data.trees_added,
      model: data.model_used,
      created_at: data.created_at
    }
  }

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

  async checkUserMilestones(userId: string): Promise<Milestone[]> {
    // Get current user stats
    const user = await this.getUserProfile(userId)
    if (!user) return []

    // Get previous tree count (we'll need to track this better)
    const { data: lastQuery } = await this.supabase
      .from('queries')
      .select('trees_added')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousTrees = user.trees_planted - (lastQuery?.trees_added || 0)
    const newMilestone = checkMilestone(previousTrees, user.trees_planted)

    if (newMilestone) {
      // Record milestone in database
      await this.supabase
        .from('user_milestones')
        .insert({
          user_id: userId,
          milestone_trees: newMilestone.trees
        })
        .select()

      return [newMilestone]
    }

    return []
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

  // UTILITY FUNCTIONS
  async updateWeeklyStats(): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_weekly_stats')

    if (error) {
      console.error('Error updating weekly stats:', error)
    }
  }
}

// Export convenience functions
export const createDatabaseClient = (supabase: ReturnType<typeof createClientSupabaseClient>) => 
  new DatabaseClient(supabase)

// Default client-side database instance
export const db = new DatabaseClient(getClientDb())