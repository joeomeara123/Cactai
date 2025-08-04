import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing profile creation with service role key...')
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // Get test user ID from request body
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId in request body' },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Testing profile creation for user: ${userId}`)

    // Try to access user_profiles table with admin client
    const { data: existingProfiles, error: listError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .limit(5)

    if (listError) {
      console.error('Failed to list profiles with admin client:', listError)
      return NextResponse.json({
        error: 'Admin client cannot access user_profiles table',
        details: listError.message,
        code: listError.code
      }, { status: 500 })
    }

    console.log('Existing profiles (first 5):', existingProfiles)

    // Try to create a test profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: `test-${userId}@example.com`,
        full_name: 'Test User',
        trees_planted: 0,
        total_queries: 0,
        total_cost: 0,
        total_donated: 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create test profile:', createError)
      return NextResponse.json({
        error: 'Profile creation failed',
        details: createError.message,
        code: createError.code,
        hint: createError.hint
      }, { status: 500 })
    }

    console.log('Test profile created successfully:', newProfile)

    return NextResponse.json({
      success: true,
      message: 'Test profile created successfully',
      profile: newProfile,
      existingProfiles: existingProfiles?.length || 0
    })

  } catch (error) {
    console.error('Test profile creation error:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}