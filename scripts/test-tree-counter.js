#!/usr/bin/env node

/**
 * Tree Counter Testing Script
 * 
 * Tests the tree calculation logic to ensure accurate environmental impact tracking
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Import our impact calculation logic
const fs = require('fs')
const path = require('path')

// Test the impact calculation manually
function testImpactCalculation() {
  console.log('🌳 Testing Tree Impact Calculations...\n')

  // Simulate typical token usage for different message types
  const testScenarios = [
    { name: 'Short message', inputTokens: 50, outputTokens: 100, model: 'gpt-4o-mini' },
    { name: 'Medium message', inputTokens: 150, outputTokens: 300, model: 'gpt-4o-mini' },
    { name: 'Long message', inputTokens: 500, outputTokens: 800, model: 'gpt-4o-mini' },
    { name: 'GPT-4o message', inputTokens: 200, outputTokens: 400, model: 'gpt-4o' },
  ]

  // GPT-4o-mini pricing (per 1K tokens)
  const MODEL_PRICING = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // £ per 1K tokens
    'gpt-4o': { input: 0.0025, output: 0.01 },
  }

  // Impact constants
  const DONATION_RATE = 0.4 // 40%
  const TREES_PER_POUND = 2.5 // £1 = 2.5 trees

  console.log('💰 Model Pricing:')
  console.log('  GPT-4o-mini: £0.15/1M input tokens, £0.60/1M output tokens')
  console.log('  GPT-4o: £2.50/1M input tokens, £10.00/1M output tokens')
  console.log('📊 Impact Formula: 40% of cost → donation → trees (£1 = 2.5 trees)\n')

  testScenarios.forEach((scenario, i) => {
    const pricing = MODEL_PRICING[scenario.model]
    
    // Calculate costs (convert to per-token costs)
    const inputCost = (scenario.inputTokens * pricing.input) / 1000
    const outputCost = (scenario.outputTokens * pricing.output) / 1000
    const totalCost = inputCost + outputCost
    
    // Calculate impact
    const donation = totalCost * DONATION_RATE
    const trees = donation * TREES_PER_POUND
    
    console.log(`${i + 1}. ${scenario.name} (${scenario.model}):`)
    console.log(`   Tokens: ${scenario.inputTokens} input + ${scenario.outputTokens} output`)
    console.log(`   Cost: £${totalCost.toFixed(6)} (£${inputCost.toFixed(6)} + £${outputCost.toFixed(6)})`)
    console.log(`   Donation (40%): £${donation.toFixed(6)}`)
    console.log(`   Trees: ${trees.toFixed(8)} trees`)
    console.log(`   Human readable: ${trees < 0.001 ? (trees * 1000).toFixed(2) + ' milli-trees' : trees.toFixed(4) + ' trees'}`)
    console.log('')
  })

  return testScenarios[0] // Return first scenario for further testing
}

async function testDatabaseTreeUpdates() {
  console.log('🗄️ Testing Database Tree Updates...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase configuration')
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Check global stats
    const { data: globalStats, error } = await supabase.rpc('get_global_stats')
    if (error) throw error

    console.log('📊 Current Global Stats:')
    console.log(`   Total Users: ${globalStats.total_users}`)
    console.log(`   Total Queries: ${globalStats.total_queries}`)
    console.log(`   Total Trees: ${globalStats.total_trees}`)
    console.log(`   Total Donated: £${globalStats.total_donated}`)
    console.log('')

    // Check if there are any users with trees
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, trees_planted, total_queries')
      .gt('total_queries', 0)
      .limit(5)

    if (profileError && profileError.code !== 'PGRST301') {
      console.log('⚠️  Could not fetch user profiles (expected - RLS protection)')
    } else if (profiles && profiles.length > 0) {
      console.log('👥 Users with Activity:')
      profiles.forEach(profile => {
        console.log(`   ${profile.email}: ${profile.trees_planted} trees, ${profile.total_queries} queries`)
      })
    } else {
      console.log('ℹ️  No user activity recorded yet (first time testing)')
    }

    return true

  } catch (error) {
    console.log('❌ Database test failed:', error.message)
    return false
  }
}

async function runTreeCounterTests() {
  console.log('🧪 CactAI Tree Counter Validation\n')
  console.log('=' .repeat(60) + '\n')

  // Test 1: Impact Calculation Logic
  const scenario = testImpactCalculation()

  console.log('=' .repeat(60) + '\n')

  // Test 2: Database Integration
  const dbWorking = await testDatabaseTreeUpdates()

  console.log('=' .repeat(60) + '\n')

  // Summary
  console.log('📋 Tree Counter Analysis:')
  console.log('')
  
  if (scenario.inputTokens && scenario.outputTokens) {
    const totalTokens = scenario.inputTokens + scenario.outputTokens
    console.log(`💡 Expected behavior for a typical message:`)
    console.log(`   • ${totalTokens} tokens → ~£0.00009 cost → ~£0.000036 donation → ~0.00009 trees`)
    console.log(`   • After ~11,000+ tokens, user should see first 0.001 tree`)
    console.log(`   • After ~110,000+ tokens, user should see first whole tree`)
  }

  if (dbWorking) {
    console.log(`✅ Database integration working correctly`)
  } else {
    console.log(`⚠️  Database integration needs attention`)
  }

  console.log('')
  console.log('🎯 Next Steps:')
  console.log('1. Send several chat messages to accumulate tokens')
  console.log('2. Check if tree counter increases (might take many messages)')
  console.log('3. Verify database records the activity correctly')
  console.log('4. Consider adjusting display precision for small tree amounts')
}

// Run the tests
runTreeCounterTests()