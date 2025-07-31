import { z } from 'zod'

// Server-side environment variable validation schema
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional().default('http://localhost:3000'),
})

// Validate server-side environment variables
function validateServerEnv() {
  try {
    return serverEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    })
  } catch (error) {
    console.error('❌ Invalid server environment variables:', error)
    throw new Error('Server environment validation failed. Check your .env.local file.')
  }
}

export const serverConfig = validateServerEnv()

// Re-export client-side constants for server use
export { MODEL_CONFIG, IMPACT_CONFIG, type ModelName } from './config-client'