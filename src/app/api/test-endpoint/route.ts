import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    method: 'GET'
  })
}

export async function POST() {
  return NextResponse.json({ 
    message: 'Test POST working',
    timestamp: new Date().toISOString(),
    method: 'POST'
  })
}