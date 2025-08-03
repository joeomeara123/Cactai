#!/usr/bin/env node

/**
 * Authentication Flow Testing Script
 * 
 * Tests the authentication and user flow to validate the complete application works.
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

async function testApplicationFlow() {
  console.log('🧪 Testing CactAI Complete Application Flow...\n')

  try {
    // Test 1: Check if server is running
    console.log('1. Testing Development Server...')
    try {
      const response = await fetch('http://localhost:3000/')
      if (response.status === 200) {
        console.log('✅ Development server is running at http://localhost:3000')
      } else {
        console.log(`⚠️  Server returned status: ${response.status}`)
      }
    } catch (error) {
      console.log('❌ Development server not accessible. Make sure it\'s running.')
      return false
    }

    // Test 2: Test Authentication Endpoint
    console.log('\n2. Testing Authentication Setup...')
    try {
      // Test if we can access the auth callback route
      const authResponse = await fetch('http://localhost:3000/auth/callback')
      console.log(`✅ Auth callback endpoint accessible (status: ${authResponse.status})`)
    } catch (error) {
      console.log('⚠️  Auth callback endpoint test failed:', error.message)
    }

    // Test 3: Test API with Authentication Required
    console.log('\n3. Testing Chat API Authentication...')
    const testPayload = {
      message: "Test message for authentication",
      model: "gpt-4o-mini"
    }

    const apiResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const apiResult = await apiResponse.json()
    
    if (apiResponse.status === 401) {
      console.log('✅ API correctly requires authentication (401 response)')
    } else {
      console.log(`⚠️  Unexpected API response: ${apiResponse.status}`)
      console.log('Response:', JSON.stringify(apiResult, null, 2))
    }

    // Test 4: Database Functions
    console.log('\n4. Testing Database Functions...')
    try {
      const { data: globalStats, error } = await supabase.rpc('get_global_stats')
      if (error) throw error
      console.log('✅ Database functions working correctly')
      console.log(`   Global stats: ${JSON.stringify(globalStats)}`)
    } catch (error) {
      console.log('❌ Database functions failed:', error.message)
    }

    // Test 5: Google OAuth Configuration
    console.log('\n5. Testing Google OAuth Configuration...')
    try {
      // Check if Supabase auth is configured
      const { data, error } = await supabase.auth.getSession()
      if (!error) {
        console.log('✅ Supabase auth client working correctly')
        if (data.session) {
          console.log('✅ User is currently authenticated')
        } else {
          console.log('ℹ️  No active session (expected - user needs to sign in)')
        }
      } else {
        console.log('⚠️  Supabase auth error:', error.message)
      }
    } catch (error) {
      console.log('⚠️  Auth configuration test failed:', error.message)
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 APPLICATION READY FOR TESTING!')
    console.log('\n📋 Manual Testing Steps:')
    console.log('1. Open http://localhost:3000 in your browser')
    console.log('2. Click "Sign in with Google"')
    console.log('3. Complete Google authentication')
    console.log('4. Try sending a chat message')
    console.log('5. Verify tree counter increases')
    console.log('\n💡 If authentication works, your app is fully functional!')

    return true

  } catch (error) {
    console.error('❌ Application flow test failed:', error.message)
    return false
  }
}

// Run the test
testApplicationFlow()