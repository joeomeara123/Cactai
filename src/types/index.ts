// User types
export interface User {
  id: string
  email: string
  created_at: string
}

// Impact tracking types
export interface UserImpact {
  queries_count: number
  trees_planted: number
  trees_progress: number // 0-1 for progress to next tree
}

// Chat types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  trees_added?: number
}

// Query tracking types  
export interface QueryMetrics {
  id: string
  user_id: string
  input_tokens: number
  output_tokens: number
  trees_added: number
  created_at: string
}

// Global stats
export interface GlobalStats {
  total_users: number
  total_trees: number
  trees_this_week: number
}