import { z } from 'zod'

// Validation schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().optional(),
  avatar_url: z.string().optional(),
  
  // Impact tracking
  total_queries: z.number().int().min(0).default(0),
  total_input_tokens: z.number().int().min(0).default(0),
  total_output_tokens: z.number().int().min(0).default(0),
  total_cost: z.number().min(0).default(0),
  total_donated: z.number().min(0).default(0),
  trees_planted: z.number().min(0).default(0),
  
  // Preferences
  preferred_model: z.string().default('gpt-4o-mini'),
  selected_charity: z.string().default('reforestation'),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const userImpactSchema = z.object({
  queries_count: z.number().int().min(0),
  trees_planted: z.number().min(0),
  trees_progress: z.number().min(0).max(1),
})

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
  trees_added: z.number().min(0).optional(),
  model: z.string().optional(),
})

export const queryMetricsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  input_cost: z.number().min(0),
  output_cost: z.number().min(0),
  total_cost: z.number().min(0),
  trees_added: z.number().min(0),
  model: z.string(),
  created_at: z.string().datetime(),
})

export const globalStatsSchema = z.object({
  total_users: z.number().int().min(0),
  total_trees: z.number().min(0),
  trees_this_week: z.number().min(0),
  total_queries: z.number().int().min(0),
})

// Type inference from schemas
export type User = z.infer<typeof userSchema>
export type UserImpact = z.infer<typeof userImpactSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type QueryMetrics = z.infer<typeof queryMetricsSchema>
export type GlobalStats = z.infer<typeof globalStatsSchema>

// Additional utility types
export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
  success: boolean
}