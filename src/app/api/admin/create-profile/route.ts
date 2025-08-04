import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      )
    }

    // Create client with anon key for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    
    // Verify the user using the access token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'User not authenticated', details: authError?.message },
        { status: 401 }
      )
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Creating profile for user: ${user.id}`)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already exists',
        profile: existingProfile 
      })
    }

    // Create the user profile using admin privileges
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
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