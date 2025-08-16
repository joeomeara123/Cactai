import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Simple chat API called')
    
    const body = await request.json()
    console.log('📝 Received body:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Simple chat endpoint working',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Simple chat error:', error)
    
    return NextResponse.json(
      { 
        error: 'Simple chat endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}