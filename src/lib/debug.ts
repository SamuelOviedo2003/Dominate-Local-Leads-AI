/**
 * Secure Debug Logging System for Session Tracking
 * Prevents user data mixing by providing structured, user-specific debug logs
 * Safe for production with conditional logging and data masking
 */

// Generate unique tab/session identifier on client side
const getTabId = (): string => {
  if (typeof window === 'undefined') return 'server'
  
  let tabId = sessionStorage.getItem('tabId')
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('tabId', tabId)
  }
  return tabId
}

// Mask sensitive data for logging
const maskSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    // Mask JWT tokens - show only first and last 8 chars
    if (data.length > 20 && (data.includes('.') && data.split('.').length === 3)) {
      return `${data.substring(0, 8)}...${data.substring(data.length - 8)}`
    }
    // Mask email addresses
    if (data.includes('@')) {
      const [username, domain] = data.split('@')
      if (username && domain) {
        return `${username.substring(0, Math.min(2, username.length))}***@${domain}`
      }
    }
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData)
  }
  
  if (data && typeof data === 'object') {
    const masked: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Mask sensitive fields
      if (['password', 'token', 'secret', 'key', 'auth', 'jwt'].some(sensitive => 
        key.toLowerCase().includes(sensitive))) {
        masked[key] = '[MASKED]'
      } else {
        masked[key] = maskSensitiveData(value)
      }
    }
    return masked
  }
  
  return data
}

// Debug log levels
export enum DebugLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

// Context types for categorizing logs
export enum DebugContext {
  AUTH = 'AUTH',
  BUSINESS = 'BUSINESS',
  API = 'API',
  CACHE = 'CACHE',
  SESSION = 'SESSION',
  UI = 'UI'
}

interface DebugLogEntry {
  timestamp: string
  level: DebugLevel
  context: DebugContext
  tabId: string
  userId?: string
  businessId?: string
  message: string
  data?: any
  requestId?: string
  jwtHash?: string // First 8 chars of JWT for correlation
}

class SecureDebugLogger {
  private static instance: SecureDebugLogger
  private isEnabled: boolean
  private requestId: string
  
  private constructor() {
    // Enable debug logging based on environment and debug flag
    this.isEnabled = this.shouldEnableLogging()
    this.requestId = this.generateRequestId()
  }
  
  static getInstance(): SecureDebugLogger {
    if (!SecureDebugLogger.instance) {
      SecureDebugLogger.instance = new SecureDebugLogger()
    }
    return SecureDebugLogger.instance
  }
  
  private shouldEnableLogging(): boolean {
    if (typeof window !== 'undefined') {
      // Client-side checks
      const isLocalhost = window.location.hostname === 'localhost'
      const isDev = window.location.hostname.includes('localhost') || 
                   window.location.hostname.includes('dev')
      const debugFlag = localStorage.getItem('debug-session-tracking') === 'true'
      const urlDebug = new URLSearchParams(window.location.search).has('debug')
      
      return process.env.NODE_ENV === 'development' || isLocalhost || isDev || debugFlag || urlDebug
    } else {
      // Server-side checks
      return process.env.NODE_ENV === 'development' || 
             process.env.DEBUG_SESSION_TRACKING === 'true'
    }
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }
  
  private createLogEntry(
    level: DebugLevel,
    context: DebugContext,
    message: string,
    data?: any,
    metadata?: {
      userId?: string
      businessId?: string
      jwtToken?: string
    }
  ): DebugLogEntry {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      tabId: getTabId(),
      message,
      requestId: this.requestId
    }
    
    if (metadata) {
      if (metadata.userId) entry.userId = metadata.userId
      if (metadata.businessId) entry.businessId = metadata.businessId
      if (metadata.jwtToken) {
        entry.jwtHash = metadata.jwtToken.substring(0, 8)
      }
    }
    
    if (data) {
      entry.data = maskSensitiveData(data)
    }
    
    return entry
  }
  
  private outputLog(entry: DebugLogEntry): void {
    if (!this.isEnabled) return
    
    const prefix = `[${entry.level}][${entry.context}][${entry.tabId}]`
    const userInfo = entry.userId ? `[U:${entry.userId.substring(0, 8)}]` : ''
    const businessInfo = entry.businessId ? `[B:${entry.businessId}]` : ''
    const jwtInfo = entry.jwtHash ? `[JWT:${entry.jwtHash}]` : ''
    const reqInfo = `[${entry.requestId}]`
    
    const fullPrefix = `${prefix}${userInfo}${businessInfo}${jwtInfo}${reqInfo}`
    
    switch (entry.level) {
      case DebugLevel.ERROR:
        console.error(`${fullPrefix} ${entry.message}`, entry.data || '')
        break
      case DebugLevel.WARN:
        console.warn(`${fullPrefix} ${entry.message}`, entry.data || '')
        break
      case DebugLevel.INFO:
        console.info(`${fullPrefix} ${entry.message}`, entry.data || '')
        break
      case DebugLevel.DEBUG:
      case DebugLevel.TRACE:
      default:
        console.log(`${fullPrefix} ${entry.message}`, entry.data || '')
        break
    }
  }
  
  log(
    level: DebugLevel,
    context: DebugContext,
    message: string,
    data?: any,
    metadata?: {
      userId?: string
      businessId?: string
      jwtToken?: string
    }
  ): void {
    const entry = this.createLogEntry(level, context, message, data, metadata)
    this.outputLog(entry)
  }
  
  // Convenience methods for different contexts
  auth(message: string, data?: any, metadata?: { userId?: string; jwtToken?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.AUTH, message, data, metadata)
  }
  
  business(message: string, data?: any, metadata?: { userId?: string; businessId?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.BUSINESS, message, data, metadata)
  }
  
  api(message: string, data?: any, metadata?: { userId?: string; businessId?: string; jwtToken?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.API, message, data, metadata)
  }
  
  cache(message: string, data?: any, metadata?: { userId?: string; businessId?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.CACHE, message, data, metadata)
  }
  
  session(message: string, data?: any, metadata?: { userId?: string; businessId?: string; jwtToken?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.SESSION, message, data, metadata)
  }
  
  ui(message: string, data?: any, metadata?: { userId?: string; businessId?: string }): void {
    this.log(DebugLevel.DEBUG, DebugContext.UI, message, data, metadata)
  }
  
  error(context: DebugContext, message: string, error?: Error, metadata?: { userId?: string; businessId?: string }): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
    } : undefined
    
    this.log(DebugLevel.ERROR, context, message, errorData, metadata)
  }
  
  warn(context: DebugContext, message: string, data?: any, metadata?: { userId?: string; businessId?: string }): void {
    this.log(DebugLevel.WARN, context, message, data, metadata)
  }
  
  info(context: DebugContext, message: string, data?: any, metadata?: { userId?: string; businessId?: string }): void {
    this.log(DebugLevel.INFO, context, message, data, metadata)
  }
  
  // Enable/disable logging dynamically
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.setItem('debug-session-tracking', 'true')
      } else {
        localStorage.removeItem('debug-session-tracking')
      }
    }
  }
  
  // Get current status
  getStatus(): { enabled: boolean; tabId: string; requestId: string } {
    return {
      enabled: this.isEnabled,
      tabId: getTabId(),
      requestId: this.requestId
    }
  }
}

// Export singleton instance
export const debugLogger = SecureDebugLogger.getInstance()

// Convenience exports
export const debugAuth = debugLogger.auth.bind(debugLogger)
export const debugBusiness = debugLogger.business.bind(debugLogger)
export const debugAPI = debugLogger.api.bind(debugLogger)
export const debugCache = debugLogger.cache.bind(debugLogger)
export const debugSession = debugLogger.session.bind(debugLogger)
export const debugUI = debugLogger.ui.bind(debugLogger)
export const debugError = debugLogger.error.bind(debugLogger)
export const debugWarn = debugLogger.warn.bind(debugLogger)
export const debugInfo = debugLogger.info.bind(debugLogger)

// Helper function to extract user metadata from common data sources
export const extractUserMetadata = (user?: any, businessContext?: any): {
  userId?: string
  businessId?: string
} => {
  const metadata: any = {}
  
  if (user) {
    metadata.userId = user.id || user.userId
  }
  
  if (businessContext) {
    metadata.businessId = businessContext.currentBusinessId || 
                          businessContext.selectedCompany?.business_id ||
                          businessContext.business_id
  }
  
  return metadata
}

// Helper to debug cache operations with standard format
export const debugCacheOperation = (
  operation: 'hit' | 'miss' | 'set' | 'invalidate',
  key: string,
  data?: any,
  metadata?: { userId?: string; businessId?: string }
) => {
  debugCache(`Cache ${operation.toUpperCase()}: ${key}`, data, metadata)
}

// Helper to debug API requests with standard format
export const debugAPIRequest = (
  method: string,
  path: string,
  params?: any,
  metadata?: { userId?: string; businessId?: string; jwtToken?: string }
) => {
  debugAPI(`${method} ${path}`, { params }, metadata)
}

// Helper to debug API responses with standard format  
export const debugAPIResponse = (
  method: string,
  path: string,
  status: number,
  data?: any,
  metadata?: { userId?: string; businessId?: string }
) => {
  const level = status >= 400 ? DebugLevel.ERROR : DebugLevel.DEBUG
  debugLogger.log(level, DebugContext.API, `${method} ${path} -> ${status}`, { response: data }, metadata)
}

// Development helper to enable logging in browser console
if (typeof window !== 'undefined') {
  (window as any).__enableSessionDebug = () => {
    debugLogger.setEnabled(true)
    console.log('Session debugging enabled. Reload the page to see debug logs.')
  }
  
  (window as any).__disableSessionDebug = () => {
    debugLogger.setEnabled(false)
    console.log('Session debugging disabled.')
  }
  
  (window as any).__debugStatus = () => {
    console.log('Debug status:', debugLogger.getStatus())
  }
}