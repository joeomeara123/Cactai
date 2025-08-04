import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // Get userId from request body
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId in request body' },
        { status: 400 }
      )
    }

    console.log('Creating profile for user:', userId)

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      console.log('Profile already exists for user:', userId)
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already exists',
        profile: existingProfile 
      })
    }

    console.log('Profile does not exist, creating new profile for:', userId)

    // Create the user profile using admin privileges
    // Since we don't have user metadata, create with minimal info
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: `user-${userId}@temp.com`, // Temporary email, will be updated later
        full_name: null,
        avatar_url: null,
        trees_planted: 0,
        total_queries: 0,
        total_cost: 0,
        total_donated: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create user profile:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create profile',
          details: createError.message,
          code: createError.code
        },
        { status: 500 }
      )
    }

    console.log('Profile created successfully:', newProfile)

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    })

  } catch (error) {
    console.error('Unexpected error in create-profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}