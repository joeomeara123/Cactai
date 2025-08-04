import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    console.log('🔧 Starting profile fix process...')
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Fetching users from auth.users...')

    // Get all users from auth.users table
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('🔧 Failed to fetch auth users:', authError)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: authError.message },
        { status: 500 }
      )
    }

    console.log(`🔧 Found ${authUsers.users.length} auth users`)

    // Get existing profiles
    const { data: existingProfiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')

    if (profileError) {
      console.error('🔧 Failed to fetch existing profiles:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profileError.message },
        { status: 500 }
      )
    }

    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || [])
    console.log(`🔧 Found ${existingProfileIds.size} existing profiles`)

    // Find users without profiles
    const usersWithoutProfiles = authUsers.users.filter(user => !existingProfileIds.has(user.id))
    console.log(`🔧 Found ${usersWithoutProfiles.length} users without profiles`)

    if (usersWithoutProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have profiles',
        totalUsers: authUsers.users.length,
        existingProfiles: existingProfileIds.size,
        missingProfiles: 0
      })
    }

    // Create profiles for users without them
    const profilesToCreate = usersWithoutProfiles.map(user => ({
      id: user.id,
      email: user.email || `user-${user.id}@temp.com`,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      trees_planted: 0,
      total_queries: 0,
      total_cost: 0,
      total_donated: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log('🔧 Creating profiles for users:', profilesToCreate.map(p => p.id))

    const { data: createdProfiles, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profilesToCreate)
      .select()

    if (createError) {
      console.error('🔧 Failed to create profiles:', createError)
      return NextResponse.json(
        { 
          error: 'Failed to create profiles', 
          details: createError.message,
          code: createError.code,
          hint: createError.hint
        },
        { status: 500 }
      )
    }

    console.log(`🔧 Successfully created ${createdProfiles?.length || 0} profiles`)

    return NextResponse.json({
      success: true,
      message: 'Profiles created successfully',
      totalUsers: authUsers.users.length,
      existingProfiles: existingProfileIds.size,
      createdProfiles: createdProfiles?.length || 0,
      missingProfileUsers: usersWithoutProfiles.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at
      }))
    })

  } catch (error) {
    console.error('🔧 Unexpected error in fix-profiles:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}