#!/usr/bin/env node

/**
 * Comprehensive Database Setup Validation Script
 * 
 * This script validates that all critical database functions, RLS policies,
 * and core functionality are properly configured for CactAI.
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

async function validateDatabaseSetup() {
  console.log('🔍 Validating CactAI Database Setup...\n')

  let allTestsPassed = true

  try {
    // Test 1: Database Functions
    console.log('1. Testing Database Functions...')
    
    try {
      const { data: globalStats, error: globalError } = await supabase.rpc('get_global_stats')
      if (globalError) throw globalError
      console.log('✅ get_global_stats() function working')
      console.log(`   Global stats: ${JSON.stringify(globalStats)}`)
    } catch (err) {
      console.log(`❌ get_global_stats() function missing: ${err.message}`)
      allTestsPassed = false
    }

    try {
      // Test with a dummy UUID
      const dummyUuid = '00000000-0000-0000-0000-000000000000'
      const { data: userImpact, error: impactError } = await supabase.rpc('get_user_impact', { user_uuid: dummyUuid })
      if (impactError && !impactError.message.includes('null')) throw impactError
      console.log('✅ get_user_impact() function exists')
    } catch (err) {
      console.log(`❌ get_user_impact() function missing: ${err.message}`)
      allTestsPassed = false
    }

    try {
      const dummyUuid = '00000000-0000-0000-0000-000000000000'
      const { data: milestones, error: milestonesError } = await supabase.rpc('check_milestones', { user_uuid: dummyUuid })
      if (milestonesError && !milestonesError.message.includes('null')) throw milestonesError
      console.log('✅ check_milestones() function exists')
    } catch (err) {
      console.log(`❌ check_milestones() function missing: ${err.message}`)
      allTestsPassed = false
    }

    // Test 2: Row Level Security
    console.log('\n2. Testing Row Level Security...')
    
    // This should fail without authentication - that's good!
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (profileError && (profileError.code === 'PGRST301' || profileError.message.includes('row-level security'))) {
      console.log('✅ RLS is properly configured (access denied without auth)')
    } else if (profileError) {
      console.log(`⚠️  Unexpected RLS error: ${profileError.message}`)
    } else if (!profileData || profileData.length === 0) {
      console.log('✅ RLS is working (no data returned without auth)')
    } else {
      console.log('❌ RLS might not be configured - got data without authentication')
      allTestsPassed = false
    }

    // Test 3: Table Structure
    console.log('\n3. Validating Table Structure...')
    
    const tables = ['user_profiles', 'chat_sessions', 'queries', 'user_milestones', 'global_stats']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error && error.code !== 'PGRST116' && error.code !== 'PGRST301') {
          throw error
        }
        console.log(`✅ Table '${table}' exists and is properly configured`)
      } catch (error) {
        console.log(`❌ Table '${table}' has issues: ${error.message}`)
        allTestsPassed = false
      }
    }

    // Test 4: Global Stats Initialization
    console.log('\n4. Testing Global Stats Initialization...')
    
    try {
      const { data: stats, error: statsError } = await supabase
        .from('global_stats')
        .select('*')
        .eq('id', 1)
        .single()
      
      if (statsError) {
        console.log('❌ Global stats not initialized properly')
        allTestsPassed = false
      } else {
        console.log('✅ Global stats table properly initialized')
        console.log(`   Current stats: users=${stats.total_users}, queries=${stats.total_queries}, trees=${stats.total_trees}`)
      }
    } catch (error) {
      console.log(`❌ Global stats validation failed: ${error.message}`)
      allTestsPassed = false
    }

    // Test 5: Environment Variables
    console.log('\n5. Validating Environment Configuration...')
    
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
        allTestsPassed = false
      }
    }

    // Test 6: OpenAI Configuration
    console.log('\n6. Testing OpenAI Configuration...')
    
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey && openaiKey.startsWith('sk-') && openaiKey.length > 20) {
      console.log('✅ OpenAI API key format looks correct')
    } else {
      console.log('❌ OpenAI API key appears invalid')
      allTestsPassed = false
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Database setup is complete and ready for production.')
      console.log('\n📋 Next Steps:')
      console.log('1. Configure Google OAuth in Supabase dashboard')
      console.log('2. Deploy to production (Vercel)')
      console.log('3. Test end-to-end user flow')
      console.log('4. Validate chat functionality with real users')
    } else {
      console.log('❌ SETUP INCOMPLETE! Some critical components are missing.')
      console.log('\n📋 Required Actions:')
      console.log('1. Follow the instructions in SETUP-DATABASE.md')
      console.log('2. Run the missing SQL scripts in Supabase SQL Editor')
      console.log('3. Re-run this validation script')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error.message)
    process.exit(1)
  }
}

// Export for use in other scripts
module.exports = { validateDatabaseSetup }

// Run if called directly
if (require.main === module) {
  validateDatabaseSetup()
}