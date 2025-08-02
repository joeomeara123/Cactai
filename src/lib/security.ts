/**
 * Production-grade security utilities and middleware
 * 
 * Provides comprehensive security features including rate limiting,
 * input validation, CSRF protection, and security headers.
 */

import { z } from 'zod'
import { logger, ErrorCategory } from './monitoring'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (identifier: string) => string
}

// Rate limit store (in-memory, replace with Redis in production)
interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key)
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry)
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  size(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.clear()
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore()

// Rate limiting implementation
export class RateLimit {
  private config: RateLimitConfig
  private store: RateLimitStore

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (identifier: string) => identifier,
      ...config
    }
    this.store = store || rateLimitStore
  }

  /**
   * Check if request should be rate limited
   */
  isAllowed(identifier: string): {
    allowed: boolean
    limit: number
    current: number
    remaining: number
    resetTime: number
  } {
    const key = this.config.keyGenerator!(identifier)
    const now = Date.now()

    let entry = this.store.get(key)

    // Clean up or initialize entry
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      }
    }

    // Increment counter
    entry.count++
    this.store.set(key, entry)

    const allowed = entry.count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count)

    return {
      allowed,
      limit: this.config.maxRequests,
      current: entry.count,
      remaining,
      resetTime: entry.resetTime
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator!(identifier)
    this.store.delete(key)
  }

  /**
   * Get current stats for identifier
   */
  getStats(identifier: string): {
    limit: number
    current: number
    remaining: number
    resetTime: number
  } | null {
    const key = this.config.keyGenerator!(identifier)
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.count)

    return {
      limit: this.config.maxRequests,
      current: entry.count,
      remaining,
      resetTime: entry.resetTime
    }
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // API requests: 60 per minute per user
  api: new RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 60
  }),

  // Chat requests: 10 per minute per user (more expensive)
  chat: new RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  // Auth requests: 5 per minute per IP (more sensitive)
  auth: new RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5
  }),

  // Global requests: 1000 per minute per IP (DDoS protection)
  global: new RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1000
  })
}

// Input validation schemas
export const securitySchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email format').max(254),

  // Safe string (no special characters that could cause issues)
  safeString: z.string()
    .regex(/^[a-zA-Z0-9\s\-._@]+$/, 'Contains invalid characters')
    .max(1000),

  // Chat message validation
  chatMessage: z.string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message too long')
    .refine(
      (msg) => msg.trim().length > 0,
      'Message cannot be only whitespace'
    ),

  // Model name validation
  modelName: z.enum(['gpt-4o-mini', 'gpt-4o', 'gpt-4']),

  // Pagination validation
  pagination: z.object({
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
}

// Request validation function
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: {
    correlationId?: string
    sanitize?: boolean
  } = {}
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data)
    
    logger.debug('Request validation successful', {
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      metadata: { 
        schemaType: 'ZodSchema',
        sanitize: options.sanitize 
      }
    })

    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ')

      logger.warn('Request validation failed', {
        ...(options.correlationId ? { correlationId: options.correlationId } : {}),
        category: ErrorCategory.VALIDATION,
        metadata: {
          errors: error.errors,
          receivedData: typeof data === 'object' ? JSON.stringify(data) : String(data)
        }
      })

      return { success: false, error: `Validation error: ${errorMessage}` }
    }

    logger.error('Unexpected validation error', error as Error, {
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      category: ErrorCategory.VALIDATION
    })

    return { success: false, error: 'Validation failed' }
  }
}

// Content Security Policy headers
export const cspHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
}

// Security headers for production
export const securityHeaders = {
  // Content Security Policy
  ...cspHeaders,
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filtering
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent information disclosure
  'X-Powered-By': 'CactAI',
  
  // Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', ')
}

// IP address utilities
export function getClientIp(request: Request): string {
  // Check common headers for real IP
  const headers = request.headers
  
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]
    return firstIp ? firstIp.trim() : '127.0.0.1'
  }
  
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to a default (should not happen in production)
  return '127.0.0.1'
}

// Sanitization utilities
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function sanitizeForDatabase(input: string): string {
  // Remove potential SQL injection patterns
  return input
    .replace(/['"\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim()
}

// CSRF token generation and validation
export function generateCsrfToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')
}

export function validateCsrfToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0
  const a = Buffer.from(token, 'base64')
  const b = Buffer.from(expectedToken, 'base64')
  
  if (a.length !== b.length) {
    return false
  }
  
  for (let i = 0; i < a.length; i++) {
    const byteA = a[i]
    const byteB = b[i]
    if (byteA !== undefined && byteB !== undefined) {
      result |= byteA ^ byteB
    }
  }
  
  return result === 0
}

// Security audit logging
export function auditLog(
  action: string,
  userId?: string,
  details?: Record<string, unknown>,
  correlationId?: string
): void {
  logger.info(`Security audit: ${action}`, {
    ...(correlationId ? { correlationId } : {}),
    ...(userId ? { userId } : {}),
    category: ErrorCategory.AUTHORIZATION,
    metadata: {
      action,
      timestamp: new Date().toISOString(),
      ...details
    }
  })
}

// Export store for testing
export { rateLimitStore }

// Cleanup function for graceful shutdown
export function cleanupSecurity(): void {
  rateLimitStore.destroy()
}