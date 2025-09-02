/**
 * Comprehensive API middleware system
 * Provides rate limiting, validation, authentication, and error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from './logging'
import { validateRequest } from './validation'
import { getAuthenticatedUserForAPI } from './auth-helpers'
import { requireValidBusinessId } from './type-utils'

// Rate limiting store (in-memory for now, can be moved to Redis for production scaling)
interface RateLimitStore {
  [key: string]: {
    requests: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  identifier: 'ip' | 'user' | 'business' // What to rate limit by
}

const DEFAULT_RATE_LIMITS: { [endpoint: string]: RateLimitConfig } = {
  // Authentication endpoints (stricter limits)
  '/api/auth/': { windowMs: 15 * 60 * 1000, maxRequests: 5, identifier: 'ip' }, // 5 requests per 15 minutes
  '/api/login': { windowMs: 15 * 60 * 1000, maxRequests: 5, identifier: 'ip' },
  
  // General API endpoints
  '/api/leads/': { windowMs: 60 * 1000, maxRequests: 100, identifier: 'user' }, // 100 requests per minute per user
  '/api/salesman/': { windowMs: 60 * 1000, maxRequests: 60, identifier: 'user' },
  '/api/incoming-calls/': { windowMs: 60 * 1000, maxRequests: 60, identifier: 'user' },
  '/api/dashboard/': { windowMs: 60 * 1000, maxRequests: 30, identifier: 'user' },
  
  // File/image operations (more restrictive)
  '/api/image-proxy': { windowMs: 60 * 1000, maxRequests: 20, identifier: 'user' },
  '/api/colors/extract': { windowMs: 60 * 1000, maxRequests: 10, identifier: 'user' },
  
  // Default fallback
  default: { windowMs: 60 * 1000, maxRequests: 50, identifier: 'ip' }
}

/**
 * Rate limiting middleware
 */
export async function applyRateLimit(
  request: NextRequest,
  endpoint: string,
  identifier?: string
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  const config = getRateLimitConfig(endpoint)
  const key = await getRateLimitKey(request, config.identifier, identifier)
  
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  // Clean up old entries
  if (rateLimitStore[key] && rateLimitStore[key].resetTime < windowStart) {
    delete rateLimitStore[key]
  }
  
  // Initialize or update counter
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      requests: 1,
      resetTime: now + config.windowMs
    }
  } else {
    rateLimitStore[key].requests++
  }
  
  // Check if limit exceeded
  if (rateLimitStore[key]?.requests && rateLimitStore[key].requests > config.maxRequests) {
    const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
    
    logger.warn('Rate limit exceeded', {
      endpoint,
      identifier: key,
      requests: rateLimitStore[key].requests,
      limit: config.maxRequests,
      retryAfter
    })
    
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter,
          limit: config.maxRequests,
          window: config.windowMs / 1000
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - rateLimitStore[key].requests).toString(),
            'X-RateLimit-Reset': rateLimitStore[key].resetTime.toString()
          }
        }
      )
    }
  }
  
  return { success: true }
}

/**
 * Get rate limit configuration for endpoint
 */
function getRateLimitConfig(endpoint: string): RateLimitConfig {
  for (const [pattern, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
    if (pattern === 'default') continue
    if (endpoint.startsWith(pattern)) {
      return config
    }
  }
  return DEFAULT_RATE_LIMITS.default!
}

/**
 * Generate rate limit key based on identifier type
 */
async function getRateLimitKey(
  request: NextRequest,
  identifier: 'ip' | 'user' | 'business',
  customId?: string
): Promise<string> {
  if (customId) {
    return `${identifier}:${customId}`
  }
  
  switch (identifier) {
    case 'ip':
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 '127.0.0.1'
      return `ip:${ip.split(',')[0]?.trim() || '127.0.0.1'}`
    
    case 'user':
      try {
        const user = await getAuthenticatedUserForAPI()
        return user?.id ? `user:${user.id}` : `ip:${request.headers.get('x-forwarded-for') || '127.0.0.1'}`
      } catch {
        return `ip:${request.headers.get('x-forwarded-for') || '127.0.0.1'}`
      }
    
    case 'business':
      try {
        const user = await getAuthenticatedUserForAPI()
        const businessId = user?.profile?.business_id ? requireValidBusinessId(user.profile.business_id) : null
        return businessId ? `business:${businessId}` : `user:${user?.id || 'anonymous'}`
      } catch {
        return `ip:${request.headers.get('x-forwarded-for') || '127.0.0.1'}`
      }
    
    default:
      return `ip:${request.headers.get('x-forwarded-for') || '127.0.0.1'}`
  }
}

/**
 * Authentication middleware wrapper
 */
export async function requireAuthentication(
  request: NextRequest,
  requiredRole?: number
): Promise<{ success: true; user: any } | { success: false; response: NextResponse }> {
  try {
    const user = await getAuthenticatedUserForAPI()
    
    if (!user || !user.profile?.business_id) {
      logger.warn('Unauthenticated API access attempt', {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent')
      })
      
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        )
      }
    }
    
    // Check role requirement
    if (requiredRole !== undefined && user.profile.role > requiredRole) {
      logger.warn('Insufficient permissions for API access', {
        url: request.url,
        userId: user.id,
        userRole: user.profile.role,
        requiredRole
      })
      
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
    
    return { success: true, user }
  } catch (error) {
    logger.error('Authentication middleware error', { error, url: request.url })
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Request validation middleware
 */
export function validateRequestData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): { success: true; data: T } | { success: false; response: NextResponse } {
  const validation = validateRequest(schema, data, context)
  
  if (!validation.success) {
    logger.warn('Request validation failed', {
      context,
      error: validation.error,
      data: typeof data === 'object' ? Object.keys(data as object) : typeof data
    })
    
    return {
      success: false,
      response: NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
  }
  
  return { success: true, data: validation.data }
}

/**
 * Comprehensive API handler wrapper
 * Combines rate limiting, authentication, validation, and error handling
 */
export function createSecureAPIHandler<TInput = any, TOutput = any>(config: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  endpoint: string
  requireAuth?: boolean
  requiredRole?: number
  inputSchema?: z.ZodType<TInput>
  rateLimit?: RateLimitConfig
  handler: (request: NextRequest, validatedInput?: TInput, user?: any) => Promise<TOutput>
}) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      // Apply rate limiting
      const rateLimitResult = await applyRateLimit(request, config.endpoint)
      if (!rateLimitResult.success) {
        return rateLimitResult.response
      }
      
      // Apply authentication if required
      let user: any = null
      if (config.requireAuth !== false) { // Default to requiring auth
        const authResult = await requireAuthentication(request, config.requiredRole)
        if (!authResult.success) {
          return authResult.response
        }
        user = authResult.user
      }
      
      // Parse and validate input if schema provided
      let validatedInput: TInput | undefined = undefined
      if (config.inputSchema) {
        let rawInput: unknown
        
        if (config.method === 'GET') {
          const url = new URL(request.url)
          rawInput = Object.fromEntries(url.searchParams.entries())
          // Also include path parameters if available
          if (context?.params) {
            rawInput = { ...(rawInput as object), ...context.params }
          }
        } else {
          try {
            rawInput = await request.json()
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid JSON in request body' },
              { status: 400 }
            )
          }
        }
        
        const validationResult = validateRequestData(config.inputSchema, rawInput, config.endpoint)
        if (!validationResult.success) {
          return validationResult.response
        }
        validatedInput = validationResult.data
      }
      
      // Call the actual handler
      const result = await config.handler(request, validatedInput, user)
      
      // Log successful request
      const duration = Date.now() - startTime
      logger.info('API request completed', {
        method: config.method,
        endpoint: config.endpoint,
        duration,
        userId: user?.id,
        businessId: user?.profile?.business_id
      })
      
      return NextResponse.json({
        success: true,
        data: result
      })
      
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('API handler error', {
        method: config.method,
        endpoint: config.endpoint,
        duration,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return NextResponse.json(
        { 
          error: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : 'Unknown error')
            : 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * CORS headers for API responses
 */
export function addCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}

/**
 * Security headers for enhanced protection
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  return response
}