import { z } from 'zod'

// Client-side environment variable validation schema
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional().default('http://localhost:3000'),
})

// Validate client-side environment variables
function validateClientEnv() {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    })
  } catch (error) {
    console.error('❌ Invalid client environment variables:', error)
    throw new Error('Client environment validation failed. Check your .env.local file.')
  }
}

export const clientConfig = validateClientEnv()

// Model configuration (can be used on client for UI purposes)
export const MODEL_CONFIG = {
  'gpt-4o-mini': {
    inputCostPer1K: 0.00015,
    outputCostPer1K: 0.0006,
    contextWindow: 128000,
  },
  'gpt-4o': {
    inputCostPer1K: 0.0025,
    outputCostPer1K: 0.01,
    contextWindow: 128000,
  },
  'gpt-4': {
    inputCostPer1K: 0.03,
    outputCostPer1K: 0.06,
    contextWindow: 8192,
  },
} as const

export type ModelName = keyof typeof MODEL_CONFIG

// Impact calculation constants
export const IMPACT_CONFIG = {
  DONATION_RATE: 0.4, // 40% to charity
  TREES_PER_POUND: 2.5, // £1 = 2.5 trees (based on Ecosia model)
} as const