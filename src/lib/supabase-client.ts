import { createBrowserClient } from '@supabase/ssr'
import { clientConfig } from './config-client'

// Client-side Supabase client (for use in client components)
export const createClientSupabaseClient = () =>
  createBrowserClient(clientConfig.NEXT_PUBLIC_SUPABASE_URL, clientConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY)