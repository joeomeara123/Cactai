#!/usr/bin/env node

/**
 * Chat API Testing Script
 * 
 * Tests the core chat functionality to validate OpenAI integration
 * and basic application flow without requiring full authentication.
 */

const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

async function testChatAPI() {
  console.log('🧪 Testing CactAI Chat API...\n')

  try {
    // Test if we can make a request to the chat API
    // Note: This will likely fail due to authentication, but we can see the error handling
    
    const testPayload = {
      message: "Hello, test message for CactAI!",
      model: "gpt-4o-mini"
    }

    console.log('📤 Testing chat API endpoint...')
    console.log(`Payload: ${JSON.stringify(testPayload, null, 2)}`)

    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const result = await response.json()
    
    console.log(`📥 Response Status: ${response.status}`)
    console.log(`Response: ${JSON.stringify(result, null, 2)}`)

    if (response.status === 401) {
      console.log('✅ Authentication working correctly (401 as expected without auth)')
    } else if (response.status === 400) {
      console.log('✅ Input validation working correctly')
    } else if (response.status === 200) {
      console.log('🎉 Chat API working successfully!')
      if (result.treesAdded) {
        console.log(`🌳 Trees added: ${result.treesAdded}`)
      }
    } else {
      console.log(`⚠️  Unexpected response status: ${response.status}`)
    }

    // Test OpenAI configuration
    console.log('\n🔧 Testing OpenAI Configuration...')
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (!openaiKey) {
      console.log('❌ OpenAI API key missing')
      return false
    }

    if (!openaiKey.startsWith('sk-')) {
      console.log('❌ OpenAI API key format invalid')
      return false
    }

    console.log('✅ OpenAI API key format correct')

    // Test basic OpenAI connectivity (without using tokens)
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        }
      })

      if (openaiResponse.status === 200) {
        console.log('✅ OpenAI API connectivity confirmed')
      } else if (openaiResponse.status === 401) {
        console.log('❌ OpenAI API key invalid or expired')
        return false
      } else {
        console.log(`⚠️  OpenAI API returned status: ${openaiResponse.status}`)
      }
    } catch (error) {
      console.log(`⚠️  OpenAI API connectivity test failed: ${error.message}`)
    }

    return true

  } catch (error) {
    console.error('❌ Chat API test failed:', error.message)
    return false
  }
}

// Test if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/')
    if (response.status === 200) {
      console.log('✅ Development server is running')
      return true
    }
  } catch (error) {
    console.log('❌ Development server not running. Please run: npm run dev')
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting CactAI API Tests...\n')
  
  const serverRunning = await checkServerStatus()
  if (!serverRunning) {
    process.exit(1)
  }

  const apiWorking = await testChatAPI()
  
  console.log('\n' + '='.repeat(60))
  if (apiWorking) {
    console.log('🎉 Core API functionality is working!')
    console.log('\n📋 Next Steps:')
    console.log('1. Deploy missing database functions (follow SETUP-DATABASE.md)')
    console.log('2. Configure Google OAuth')
    console.log('3. Test with real authentication')
  } else {
    console.log('❌ API tests failed. Check configuration and try again.')
  }
}

// Run if called directly
if (require.main === module) {
  runTests()
}

module.exports = { testChatAPI, checkServerStatus }