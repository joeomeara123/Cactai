import { z } from 'zod'

// Environment variable validation schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional().default('http://localhost:3000'),
})

// Validate environment variables at startup
function validateEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    })
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    throw new Error('Environment validation failed. Check your .env.local file.')
  }
}

export const config = validateEnv()

// Model configuration with accurate pricing (as of 2024)
export const MODEL_CONFIG = {
  'gpt-4o-mini': {
    inputCostPer1K: 0.00015, // $0.15 per 1M tokens = £0.00015 per 1K (approximate USD to GBP)
    outputCostPer1K: 0.0006, // $0.60 per 1M tokens = £0.0006 per 1K
    contextWindow: 128000,
  },
  'gpt-4o': {
    inputCostPer1K: 0.0025, // $2.50 per 1M tokens
    outputCostPer1K: 0.01,  // $10.00 per 1M tokens
    contextWindow: 128000,
  },
  'gpt-4': {
    inputCostPer1K: 0.03,   // $30 per 1M tokens
    outputCostPer1K: 0.06,  // $60 per 1M tokens
    contextWindow: 8192,
  },
} as const

export type ModelName = keyof typeof MODEL_CONFIG

// Impact calculation constants
export const IMPACT_CONFIG = {
  DONATION_RATE: 0.4, // 40% to charity
  TREES_PER_POUND: 2.5, // £1 = 2.5 trees (based on Ecosia model)
} as const