/**
 * Production-grade monitoring and error tracking system
 * 
 * Provides structured logging, error categorization, performance monitoring,
 * and integration-ready setup for services like Sentry, DataDog, etc.
 */

import { z } from 'zod'

// Log level enumeration
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Error category enumeration for better error handling
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network'
}

// Performance metrics interface
export interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: Date
  success: boolean
  metadata?: Record<string, unknown> | undefined
}

// Structured log entry schema
const logEntrySchema = z.object({
  timestamp: z.date(),
  level: z.nativeEnum(LogLevel),
  message: z.string(),
  category: z.nativeEnum(ErrorCategory).optional(),
  correlationId: z.string().optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    cause: z.unknown().optional()
  }).optional(),
  performance: z.object({
    operation: z.string(),
    duration: z.number(),
    success: z.boolean()
  }).optional()
})

export type LogEntry = z.infer<typeof logEntrySchema>

// Monitoring configuration
interface MonitoringConfig {
  environment: 'development' | 'production' | 'test'
  enableConsoleLogging: boolean
  enableExternalLogging: boolean
  logLevel: LogLevel
  sentryDsn?: string | undefined
  enablePerformanceTracking: boolean
}

class MonitoringService {
  private config: MonitoringConfig
  private performanceMetrics: PerformanceMetrics[] = []
  private correlationIdCounter = 0

  constructor() {
    const environment = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
    this.config = {
      environment,
      enableConsoleLogging: true,
      enableExternalLogging: !!process.env.SENTRY_DSN,
      logLevel: environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      sentryDsn: process.env.SENTRY_DSN || undefined,
      enablePerformanceTracking: true
    }
  }

  /**
   * Generate a unique correlation ID for request tracing
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${++this.correlationIdCounter}`
  }

  /**
   * Log a structured message with optional metadata
   */
  log(
    level: LogLevel,
    message: string,
    options: {
      category?: ErrorCategory
      correlationId?: string
      userId?: string
      sessionId?: string
      metadata?: Record<string, unknown>
      error?: Error
      performance?: PerformanceMetrics
    } = {}
  ): void {
    // Check if log level meets threshold
    if (!this.shouldLog(level)) return

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      ...options,
      error: options.error ? {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack,
        cause: options.error.cause
      } : undefined,
      performance: options.performance ? {
        operation: options.performance.operation,
        duration: options.performance.duration,
        success: options.performance.success
      } : undefined
    }

    // Validate log entry
    try {
      logEntrySchema.parse(logEntry)
    } catch (validationError) {
      console.error('Invalid log entry:', validationError)
      return
    }

    // Console logging (always in development, structured in production)
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry)
    }

    // External logging service (Sentry, DataDog, etc.)
    if (this.config.enableExternalLogging) {
      this.logToExternalService(logEntry)
    }

    // Store performance metrics
    if (options.performance && this.config.enablePerformanceTracking) {
      this.recordPerformanceMetric(options.performance)
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(message: string, options: Parameters<typeof this.log>[2] = {}): void {
    this.log(LogLevel.DEBUG, message, { ...options, category: options.category || ErrorCategory.SYSTEM })
  }

  info(message: string, options: Parameters<typeof this.log>[2] = {}): void {
    this.log(LogLevel.INFO, message, options)
  }

  warn(message: string, options: Parameters<typeof this.log>[2] = {}): void {
    this.log(LogLevel.WARN, message, options)
  }

  error(message: string, error?: Error, options: Parameters<typeof this.log>[2] = {}): void {
    this.log(LogLevel.ERROR, message, { 
      ...options, 
      ...(error ? { error } : {}),
      category: options.category || ErrorCategory.SYSTEM 
    })
  }

  fatal(message: string, error?: Error, options: Parameters<typeof this.log>[2] = {}): void {
    this.log(LogLevel.FATAL, message, { 
      ...options, 
      ...(error ? { error } : {}),
      category: options.category || ErrorCategory.SYSTEM 
    })
  }

  /**
   * Track performance metrics for operations
   */
  trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      correlationId?: string
      userId?: string
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const { correlationId, userId, metadata } = options

    return fn()
      .then((result) => {
        const duration = Date.now() - startTime
        const performanceMetric: PerformanceMetrics = {
          operation,
          duration,
          timestamp: new Date(),
          success: true,
          metadata
        }

        this.info(`Operation '${operation}' completed successfully`, {
          ...(correlationId ? { correlationId } : {}),
          ...(userId ? { userId } : {}),
          performance: performanceMetric,
          metadata: { ...metadata, duration }
        })

        return result
      })
      .catch((error) => {
        const duration = Date.now() - startTime
        const performanceMetric: PerformanceMetrics = {
          operation,
          duration,
          timestamp: new Date(),
          success: false,
          metadata
        }

        this.error(`Operation '${operation}' failed`, error, {
          ...(correlationId ? { correlationId } : {}),
          ...(userId ? { userId } : {}),
          performance: performanceMetric,
          metadata: { ...metadata, duration }
        })

        throw error
      })
  }

  /**
   * Track API endpoint performance
   */
  trackApiEndpoint<T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>,
    options: {
      correlationId?: string
      userId?: string
      requestSize?: number
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<T> {
    return this.trackPerformance(
      `${method.toUpperCase()} ${endpoint}`,
      fn,
      {
        ...options,
        metadata: {
          ...options.metadata,
          endpoint,
          method,
          requestSize: options.requestSize
        }
      }
    )
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.performanceMetrics.filter(m => m.operation === operation)
    }
    return [...this.performanceMetrics]
  }

  /**
   * Clear performance metrics (useful for testing)
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = []
  }

  /**
   * Create an error with proper categorization
   */
  createCategorizedError(
    message: string,
    category: ErrorCategory,
    originalError?: Error
  ): Error {
    const error = new Error(message)
    error.name = `${category.toUpperCase()}_ERROR`
    error.cause = originalError
    return error
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL]
    const currentLevelIndex = levels.indexOf(this.config.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, correlationId, error, performance } = logEntry

    // Color coding for console output
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    }
    const reset = '\x1b[0m'

    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`
    const timeStr = timestamp.toISOString()
    const corrId = correlationId ? ` [${correlationId}]` : ''
    
    console.log(`${prefix} ${timeStr}${corrId}: ${message}`)

    // Log additional context
    if (error) {
      console.error('  Error:', error.name, '-', error.message)
      if (error.stack) {
        console.error('  Stack:', error.stack)
      }
    }

    if (performance) {
      console.log(`  Performance: ${performance.operation} took ${performance.duration}ms (${performance.success ? 'success' : 'failed'})`)
    }

    if (logEntry.metadata && Object.keys(logEntry.metadata).length > 0) {
      console.log('  Metadata:', JSON.stringify(logEntry.metadata, null, 2))
    }
  }

  /**
   * Log to external service (placeholder for Sentry, DataDog, etc.)
   */
  private logToExternalService(logEntry: LogEntry): void {
    // This would integrate with services like Sentry
    if (this.config.sentryDsn && logEntry) {
      // Sentry integration would go here
      // Example: Sentry.captureException(logEntry.error, { extra: logEntry })
    }

    // For now, we'll just queue it for external processing
    // In production, this would send to your monitoring service
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceMetrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000)
    }
  }
}

// Singleton instance
export const monitoring = new MonitoringService()

// Convenience exports
export const logger = {
  debug: monitoring.debug.bind(monitoring),
  info: monitoring.info.bind(monitoring),
  warn: monitoring.warn.bind(monitoring),
  error: monitoring.error.bind(monitoring),
  fatal: monitoring.fatal.bind(monitoring),
  trackPerformance: monitoring.trackPerformance.bind(monitoring),
  trackApiEndpoint: monitoring.trackApiEndpoint.bind(monitoring),
  generateCorrelationId: monitoring.generateCorrelationId.bind(monitoring),
  createCategorizedError: monitoring.createCategorizedError.bind(monitoring)
}

/**
 * Higher-order function to add monitoring to API routes
 */
export function withMonitoring<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const correlationId = monitoring.generateCorrelationId()
    
    return monitoring.trackPerformance(
      operationName,
      () => fn(...args),
      { correlationId }
    )
  }) as T
}

/**
 * Express/Next.js middleware for request logging
 */
export function createLoggingMiddleware() {
  return (req: { 
    method: string; 
    url: string; 
    headers: Record<string, string>; 
    ip?: string; 
    connection?: { remoteAddress?: string };
    correlationId?: string;
  }, res: { 
    send: (data: unknown) => unknown; 
    statusCode: number;
  }, next: () => void) => {
    const correlationId = monitoring.generateCorrelationId()
    req.correlationId = correlationId
    
    const startTime = Date.now()
    
    monitoring.info(`${req.method} ${req.url} started`, {
      correlationId,
      metadata: {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress
      }
    })

    const originalSend = res.send
    res.send = function(data: unknown) {
      const duration = Date.now() - startTime
      
      monitoring.info(`${req.method} ${req.url} completed`, {
        correlationId,
        performance: {
          operation: `${req.method} ${req.url}`,
          duration,
          timestamp: new Date(),
          success: res.statusCode < 400,
          metadata: {
            statusCode: res.statusCode,
            responseSize: data ? String(data).length : 0
          }
        }
      })

      return originalSend.call(this, data)
    }

    next()
  }
}