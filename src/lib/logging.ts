/**
 * Production-ready logging service
 * Provides structured logging with different levels and conditional output
 * Based on environment variables for production safety
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean
  private debugEnabled: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
    this.debugEnabled = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || this.isDevelopment
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    if (this.isProduction && level === 'debug') {
      return // Don't log debug messages in production
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context })
    }

    switch (level) {
      case 'debug':
        if (this.debugEnabled) {
          console.log(`[${level.toUpperCase()}]`, message, context || '')
        }
        break
      case 'info':
        console.info(`[${level.toUpperCase()}]`, message, context || '')
        break
      case 'warn':
        console.warn(`[${level.toUpperCase()}]`, message, context || '')
        break
      case 'error':
        console.error(`[${level.toUpperCase()}]`, message, context || '')
        break
    }
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', message, context)
  }

  // Specific method for API debugging
  apiDebug(endpoint: string, method: string, context: LogContext): void {
    this.debug(`API ${method} ${endpoint}`, context)
  }

  // Specific method for database operations
  dbDebug(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table}`, context)
  }

  // Specific method for business logic
  businessLogic(operation: string, context?: LogContext): void {
    this.debug(`Business Logic: ${operation}`, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const { debug, info, warn, error } = logger