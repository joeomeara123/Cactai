import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }
    
    const cleanMessage = String(message).trim()
    let response: string
    
    // Math calculation
    if (cleanMessage.match(/^\d+\s*[x×]\s*\d+$/)) {
      const parts = cleanMessage.split(/\s*[x×]\s*/)
      if (parts.length === 2) {
        const num1 = parseInt(parts[0] || '0')
        const num2 = parseInt(parts[1] || '0')
        if (!isNaN(num1) && !isNaN(num2)) {
          const result = num1 * num2
          response = `${num1} × ${num2} = ${result.toLocaleString()} 🧮`
        } else {
          response = "Working with numbers! 🔢"
        }
      } else {
        response = "Working with numbers! 🔢"
      }
    } else if (cleanMessage.toLowerCase().includes('hello')) {
      response = "Hello! Welcome to CactAI 🌱"
    } else {
      response = `Thanks for your message: "${cleanMessage}" - planting trees! 🌳`
    }
    
    return NextResponse.json({
      response,
      treesAdded: 0.0123,
      inputTokens: 10,
      outputTokens: 20,
      totalCost: 0.0001,
      donation: 0.00004,
      model: 'gpt-4o-mini',
      responseTimeMs: 100,
      queryId: Date.now().toString()
    })
    
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}