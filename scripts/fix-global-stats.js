#!/usr/bin/env node

/**
 * Quick script to ensure global_stats table has required row
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixGlobalStats() {
  console.log('🔧 Checking and fixing global stats...')

  try {
    // Check if global stats row exists
    const { data, error } = await supabase
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single()

    if (error && error.code === 'PGRST116') {
      console.log('📝 Creating missing global stats row...')
      
      const { error: insertError } = await supabase
        .from('global_stats')
        .insert({
          id: 1,
          total_users: 0,
          total_queries: 0,
          total_trees: 0,
          trees_this_week: 0,
          total_donated: 0
        })

      if (insertError) {
        console.error('❌ Failed to create global stats:', insertError)
      } else {
        console.log('✅ Global stats row created successfully')
      }
    } else if (error) {
      console.error('❌ Error checking global stats:', error)
    } else {
      console.log('✅ Global stats row exists:', data)
    }

  } catch (error) {
    console.error('❌ Failed to fix global stats:', error)
  }
}

fixGlobalStats()