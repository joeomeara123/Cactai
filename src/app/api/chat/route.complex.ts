import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createChatCompletion, estimateTokenUsage, countStreamTokens } from '@/lib/openai'
import { calculateImpact } from '@/lib/impact'
import { DatabaseClient } from '@/lib/database'
import { logger, ErrorCategory } from '@/lib/monitoring'
import { rateLimiters, validateRequest, securitySchemas, getClientIp, auditLog } from '@/lib/security'
import { z } from 'zod'

// Vercel runtime configuration
export const runtime = 'nodejs'
export const maxDuration = 30

// Request validation schema using security schemas
const chatRequestSchema = z.object({
  message: securitySchemas.chatMessage,
  model: securitySchemas.modelName,
  sessionId: securitySchemas.uuid.optional(),
  userId: securitySchemas.uuid.optional(),
})

// Enhanced rate limiting with security features

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const correlationId = logger.generateCorrelationId()
  const clientIp = getClientIp(request)
  
  logger.info('Chat API request started', {
    correlationId,
    metadata: { 
      endpoint: '/api/chat',
      clientIp,
      userAgent: request.headers.get('user-agent') || 'unknown'
    }
  })

  try {
    // Global rate limiting (DDoS protection)
    const globalRateLimit = rateLimiters.global.isAllowed(clientIp)
    if (!globalRateLimit.allowed) {
      auditLog('rate_limit_exceeded_global', undefined, { 
        clientIp, 
        limit: globalRateLimit.limit,
        current: globalRateLimit.current 
      }, correlationId)
      
      logger.warn('Global rate limit exceeded', {
        correlationId,
        category: ErrorCategory.RATE_LIMIT,
        metadata: { clientIp, ...globalRateLimit }
      })
      
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': globalRateLimit.limit.toString(),
            'X-RateLimit-Remaining': globalRateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(globalRateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // Parse and validate request with enhanced security
    const body = await request.json()
    const validationResult = validateRequest(body, chatRequestSchema, { 
      correlationId,
      sanitize: true 
    })
    
    if (!validationResult.success) {
      logger.warn('Request validation failed', {
        correlationId,
        category: ErrorCategory.VALIDATION,
        metadata: { error: validationResult.error, clientIp }
      })
      
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }
    
    const { message, model, sessionId } = validationResult.data

    logger.debug('Request validated successfully', {
      correlationId,
      metadata: { 
        messageLength: message.length,
        model,
        hasSessionId: !!sessionId
      }
    })

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Authentication failed', {
        correlationId,
        category: ErrorCategory.AUTHENTICATION,
        error: authError || new Error('No user found')
      })
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use authenticated user ID
    const authenticatedUserId = user.id

    logger.info('User authenticated successfully', {
      correlationId,
      userId: authenticatedUserId,
      metadata: { email: user.email }
    })

    auditLog('chat_request_authenticated', authenticatedUserId, {
      model,
      messageLength: message.length,
      clientIp
    }, correlationId)

    // Chat-specific rate limiting
    const chatRateLimit = rateLimiters.chat.isAllowed(authenticatedUserId)
    if (!chatRateLimit.allowed) {
      auditLog('rate_limit_exceeded_chat', authenticatedUserId, { 
        limit: chatRateLimit.limit,
        current: chatRateLimit.current,
        clientIp
      }, correlationId)
      
      logger.warn('Chat rate limit exceeded', {
        correlationId,
        userId: authenticatedUserId,
        category: ErrorCategory.RATE_LIMIT,
        metadata: { ...chatRateLimit, clientIp }
      })
      
      return NextResponse.json(
        { error: 'Chat rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': chatRateLimit.limit.toString(),
            'X-RateLimit-Remaining': chatRateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(chatRateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // Initialize database client
    const db = new DatabaseClient(supabase)

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: `You are CactAI, an AI assistant that helps plant trees through conversations. 
        Be helpful, friendly, and occasionally mention how the user's questions are contributing to reforestation efforts.
        Keep responses concise but informative. Every query helps fund tree planting initiatives!`
      },
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Estimate input tokens
    const { inputTokens: estimatedInput } = estimateTokenUsage(messages, model)

    // Create completion with retry logic
    let completion
    let retryCount = 0
    const maxRetries = 3

    logger.debug('Starting OpenAI completion', {
      correlationId,
      userId: authenticatedUserId,
      metadata: { model, estimatedInputTokens: estimatedInput }
    })

    while (retryCount < maxRetries) {
      try {
        completion = await createChatCompletion(messages, model)
        break
      } catch (error) {
        retryCount++
        logger.warn(`OpenAI completion attempt ${retryCount} failed`, {
          correlationId,
          userId: authenticatedUserId,
          category: ErrorCategory.EXTERNAL_API,
          error: error as Error,
          metadata: { retryCount, maxRetries }
        })
        
        if (retryCount >= maxRetries) throw error
        
        // Exponential backoff
        const backoffMs = Math.pow(2, retryCount) * 1000
        logger.debug(`Retrying in ${backoffMs}ms`, { correlationId, userId: authenticatedUserId })
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }

    if (!completion) {
      const error = logger.createCategorizedError(
        'Failed to get completion after retries',
        ErrorCategory.EXTERNAL_API
      )
      logger.error('OpenAI completion failed completely', error, {
        correlationId,
        userId: authenticatedUserId,
        category: ErrorCategory.EXTERNAL_API
      })
      throw error
    }

    logger.info('OpenAI completion created successfully', {
      correlationId,
      userId: authenticatedUserId,
      metadata: { model, retriesUsed: retryCount }
    })

    // Stream and collect response
    let responseContent = ''
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      responseContent += content
    }

    if (!responseContent) {
      const error = logger.createCategorizedError(
        'No response content from OpenAI',
        ErrorCategory.EXTERNAL_API
      )
      logger.error('Empty response from OpenAI', error, {
        correlationId,
        userId: authenticatedUserId,
        category: ErrorCategory.EXTERNAL_API
      })
      throw error
    }

    // Count actual tokens
    const actualInputTokens = estimatedInput
    const actualOutputTokens = countStreamTokens(responseContent, model)

    logger.info('Response processed successfully', {
      correlationId,
      userId: authenticatedUserId,
      metadata: {
        responseLength: responseContent.length,
        actualInputTokens,
        actualOutputTokens
      }
    })

    // Calculate real environmental impact
    const impact = calculateImpact(actualInputTokens, actualOutputTokens, model)

    // Record in database
    let currentSessionId = sessionId
    if (!currentSessionId) {
      logger.debug('Creating new chat session', {
        correlationId,
        userId: authenticatedUserId
      })
      
      // Create new session if none provided
      const newSessionId = await db.createChatSession(authenticatedUserId, 'New Chat')
      if (!newSessionId) {
        const error = logger.createCategorizedError(
          'Failed to create chat session',
          ErrorCategory.DATABASE
        )
        logger.error('Database session creation failed', error, {
          correlationId,
          userId: authenticatedUserId,
          category: ErrorCategory.DATABASE
        })
        throw error
      }
      currentSessionId = newSessionId
      
      logger.info('New chat session created', {
        correlationId,
        userId: authenticatedUserId,
        sessionId: currentSessionId
      })
    }

    // Record the query
    logger.debug('Recording query in database', {
      correlationId,
      userId: authenticatedUserId,
      sessionId: currentSessionId,
      metadata: {
        treesAdded: impact.trees,
        totalCost: impact.totalCost
      }
    })

    const queryMetrics = await db.recordQuery({
      userId: authenticatedUserId,
      sessionId: currentSessionId,
      userMessage: message,
      assistantMessage: responseContent,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      model: model,
    })

    if (!queryMetrics) {
      logger.warn('Failed to record query metrics', {
        correlationId,
        userId: authenticatedUserId,
        sessionId: currentSessionId,
        category: ErrorCategory.DATABASE
      })
    } else {
      logger.info('Query recorded successfully', {
        correlationId,
        userId: authenticatedUserId,
        sessionId: currentSessionId,
        metadata: {
          queryId: queryMetrics.id,
          treesAdded: queryMetrics.trees_added
        }
      })
    }

    // Check for milestones (async, don't wait)
    db.checkUserMilestones(authenticatedUserId).catch((error) => {
      logger.warn('Failed to check user milestones', {
        correlationId,
        userId: authenticatedUserId,
        category: ErrorCategory.BUSINESS_LOGIC,
        error
      })
    })

    const responseTime = Date.now() - startTime

    logger.info('Chat API request completed successfully', {
      correlationId,
      userId: authenticatedUserId,
      sessionId: currentSessionId,
      performance: {
        operation: 'POST /api/chat',
        duration: responseTime,
        timestamp: new Date(),
        success: true,
        metadata: {
          tokensProcessed: actualInputTokens + actualOutputTokens,
          treesAdded: impact.trees,
          totalCost: impact.totalCost
        }
      }
    })

    return NextResponse.json({
      response: responseContent,
      treesAdded: impact.trees,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      totalCost: impact.totalCost,
      donation: impact.donation,
      model,
      sessionId: currentSessionId,
      responseTimeMs: responseTime,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // Determine error category and appropriate response
    let statusCode = 500
    let errorMessage = 'Internal server error'
    let category = ErrorCategory.SYSTEM
    
    if (error instanceof z.ZodError) {
      statusCode = 400
      errorMessage = 'Invalid request data'
      category = ErrorCategory.VALIDATION
    } else if (error instanceof Error) {
      if (error.name === 'AUTHENTICATION_ERROR' || error.message.includes('authentication') || error.message.includes('unauthorized')) {
        statusCode = 401
        errorMessage = 'Authentication failed'
        category = ErrorCategory.AUTHENTICATION
      } else if (error.name === 'RATE_LIMIT_ERROR' || error.message.includes('rate limit')) {
        statusCode = 429
        errorMessage = 'Rate limit exceeded'
        category = ErrorCategory.RATE_LIMIT
      } else if (error.name === 'EXTERNAL_API_ERROR' || error.message.includes('OpenAI')) {
        statusCode = 502
        errorMessage = 'AI service temporarily unavailable'
        category = ErrorCategory.EXTERNAL_API
      } else if (error.name === 'DATABASE_ERROR' || error.message.includes('database')) {
        statusCode = 500
        errorMessage = 'Database service temporarily unavailable'
        category = ErrorCategory.DATABASE
      }
    }

    // Log error with comprehensive context
    logger.error('Chat API request failed', error as Error, {
      correlationId,
      category,
      metadata: {
        statusCode,
        responseTime,
        errorType: error instanceof Error ? error.name : 'Unknown',
        endpoint: '/api/chat'
      },
      performance: {
        operation: 'POST /api/chat',
        duration: responseTime,
        timestamp: new Date(),
        success: false
      }
    })
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        correlationId // Include correlation ID for debugging
      },
      { 
        status: statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}