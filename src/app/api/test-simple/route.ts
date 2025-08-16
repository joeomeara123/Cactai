import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Hello from simple test endpoint',
    timestamp: new Date().toISOString(),
    status: 'working'
  })
}

export async function POST() {
  return NextResponse.json({ 
    message: 'POST method working',
    timestamp: new Date().toISOString(),
    status: 'working'
  })
}