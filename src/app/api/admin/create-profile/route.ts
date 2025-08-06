import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Profile creation endpoint called')
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('🔧 Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // First try to get userId from request body, then from auth header
    let userId: string | null = null
    
    try {
      const body = await request.json()
      userId = body.userId
      console.log('🔧 Got userId from request body:', userId)
    } catch {
      console.log('🔧 No JSON body, checking auth header')
    }

    // If no userId in body, extract from Authorization header
    if (!userId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log('🔧 Found auth token, decoding...')
        
        // Create temporary admin client to decode the JWT
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        
        if (authError || !user) {
          console.error('🔧 Failed to decode auth token:', authError)
          return NextResponse.json(
            { error: 'Invalid authentication token' },
            { status: 401 }
          )
        }
        
        userId = user.id
        console.log('🔧 Extracted userId from token:', userId)
      }
    }
    
    if (!userId) {
      console.error('🔧 No userId found in request body or auth header')
      return NextResponse.json(
        { error: 'Missing userId in request body or invalid auth token' },
        { status: 400 }
      )
    }

    console.log('🔧 Creating profile for user:', userId)

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if profile already exists
    console.log('🔧 Checking if profile already exists...')
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('🔧 Error checking existing profile:', checkError)
      return NextResponse.json(
        { 
          error: 'Failed to check existing profile',
          details: checkError.message,
          code: checkError.code
        },
        { status: 500 }
      )
    }

    if (existingProfile) {
      console.log('🔧 Profile already exists for user:', userId)
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already exists',
        profile: existingProfile 
      })
    }

    console.log('🔧 Profile does not exist, creating new profile for:', userId)

    // Get user metadata from auth.users for better profile creation
    console.log('🔧 Fetching user metadata from auth.users...')
    const { data: { user: authUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    let email = `user-${userId}@temp.com`
    let fullName = null
    let avatarUrl = null
    
    if (authUser && !userError) {
      email = authUser.email || email
      fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
      avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null
      console.log('🔧 Using auth user metadata:', { email, fullName, avatarUrl })
    } else {
      console.log('🔧 Could not fetch auth user metadata, using defaults:', userError)
    }

    // Create the user profile using admin privileges
    console.log('🔧 Creating user profile in database...')
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        avatar_url: avatarUrl,
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
      console.error('🔧 Failed to create user profile:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create profile',
          details: createError.message,
          code: createError.code,
          hint: createError.hint
        },
        { status: 500 }
      )
    }

    console.log('🔧 Profile created successfully:', newProfile)

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