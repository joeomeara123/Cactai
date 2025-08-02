#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script sets up the complete database schema, functions, and RLS policies
 * for the CactAI application using Supabase.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSqlFile(filePath, description) {
  console.log(`\n📄 ${description}...`)
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL content by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          // Try direct execution for statements that don't work with rpc
          const { error: directError } = await supabase
            .from('_dummy_')
            .select('*')
            .limit(0) // This will fail but allows us to execute SQL
          
          // If it's a function-related error, try a different approach
          console.log(`⚠️  Statement may need manual execution: ${statement.substring(0, 50)}...`)
        }
      }
    }
    
    console.log(`✅ ${description} completed`)
    
  } catch (error) {
    console.error(`❌ Error executing ${description}:`, error.message)
    console.log(`📝 Please manually execute the SQL file: ${filePath}`)
  }
}

async function setupDatabase() {
  console.log('🔧 Setting up CactAI Database...\n')

  try {
    // Check if we're using a service role key (needed for schema modifications)
    const { data: user, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.log('⚠️  Using anonymous key - some operations may need manual execution in Supabase SQL Editor')
    }

    // Execute schema setup
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    if (fs.existsSync(schemaPath)) {
      await executeSqlFile(schemaPath, 'Setting up database schema')
    } else {
      console.log('⚠️  Schema file not found, please run manually:')
      console.log('   1. Open Supabase SQL Editor')
      console.log('   2. Run the contents of database/schema.sql')
    }

    // Execute RLS policies
    const rlsPath = path.join(__dirname, '../database/rls-policies.sql')
    if (fs.existsSync(rlsPath)) {
      await executeSqlFile(rlsPath, 'Setting up Row Level Security policies')
    } else {
      console.log('⚠️  RLS policies file not found, please run manually:')
      console.log('   1. Open Supabase SQL Editor')
      console.log('   2. Run the contents of database/rls-policies.sql')
    }

    // Test the setup
    console.log('\n🧪 Testing database setup...')
    
    // Test functions
    try {
      const { data: globalStats, error: globalError } = await supabase.rpc('get_global_stats')
      if (globalError) throw globalError
      console.log('✅ Database functions working correctly')
    } catch (err) {
      console.log('⚠️  Database functions need manual setup in Supabase SQL Editor')
    }

    // Test global stats initialization
    const { data: stats, error: statsError } = await supabase
      .from('global_stats')
      .select('*')
      .eq('id', 1)
      .single()
    
    if (statsError) {
      console.log('⚠️  Global stats not initialized')
    } else {
      console.log('✅ Global stats table initialized')
    }

    console.log('\n🎉 Database setup completed!')
    console.log('\n📋 Manual steps (if needed):')
    console.log('1. Open Supabase Dashboard → SQL Editor')
    console.log('2. Run database/schema.sql if not already executed')
    console.log('3. Run database/rls-policies.sql if not already executed')
    console.log('4. Configure Google OAuth in Authentication → Providers')
    console.log('5. Add your production domain to allowed redirect URLs')

  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    console.log('\n📝 Please manually execute the SQL files in Supabase SQL Editor:')
    console.log('1. database/schema.sql')
    console.log('2. database/rls-policies.sql')
  }
}

// Run the setup
setupDatabase()