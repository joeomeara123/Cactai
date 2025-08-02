#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * This script tests the Supabase database connection, schema setup,
 * and basic operations to ensure the production API will work correctly.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabaseConnection() {
  console.log('🔍 Testing CactAI Database Connection and Schema...\n')

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase.from('global_stats').select('*').limit(1)
    if (error) throw error
    console.log('✅ Database connection successful')

    // Test 2: Check if all required tables exist
    console.log('\n2. Checking database schema...')
    const tables = ['user_profiles', 'chat_sessions', 'queries', 'user_milestones', 'global_stats']
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
        throw new Error(`Table ${table} not accessible: ${error.message}`)
      }
      console.log(`✅ Table '${table}' exists and is accessible`)
    }

    // Test 3: Check if stored functions exist
    console.log('\n3. Testing database functions...')
    
    try {
      const { data: globalStats, error: globalError } = await supabase.rpc('get_global_stats')
      if (globalError) throw globalError
      console.log('✅ Function get_global_stats() working')
      console.log(`   Global stats: ${JSON.stringify(globalStats)}`)
    } catch (err) {
      console.log(`⚠️  Function get_global_stats() not available: ${err.message}`)
    }

    // Test 4: Check RLS policies (this will fail if not properly configured)
    console.log('\n4. Testing Row Level Security...')
    
    // This should fail without authentication - that's good!
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (profileError && profileError.code === 'PGRST301') {
      console.log('✅ RLS is properly configured (access denied without auth)')
    } else if (profileError) {
      console.log(`⚠️  Unexpected RLS error: ${profileError.message}`)
    } else {
      console.log('⚠️  RLS might not be configured - got data without authentication')
    }

    // Test 5: Environment variables
    console.log('\n5. Checking environment configuration...')
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'NEXT_PUBLIC_APP_URL'
    ]
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`)
      } else {
        console.log(`❌ ${envVar} is missing`)
      }
    }

    console.log('\n🎉 Database connection test completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Ensure Google OAuth is configured in Supabase dashboard')
    console.log('2. Run the SQL scripts in database/ folder if functions are missing')
    console.log('3. Test the chat API with a real authentication token')
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testDatabaseConnection()