/**
 * API Route Debug Middleware
 * Provides consistent debugging for Next.js API routes
 * Tracks request/response flow, authentication, and business context
 */

import { NextRequest, NextResponse } from 'next/server'
import { debugAPI, debugAuth, debugError, extractUserMetadata, DebugContext } from '@/lib/debug'

export interface ApiDebugContext {
  method: string
  path: string
  userId?: string
  businessId?: string
  jwtToken?: string
  requestId: string
  startTime: number
}

/**
 * Create debug context for API request
 */
export function createApiDebugContext(request: NextRequest): ApiDebugContext {
  const url = new URL(request.url)
  const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  // Extract JWT token from Authorization header (for debugging correlation)
  const authHeader = request.headers.get('authorization')
  const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
  
  const context: ApiDebugContext = {
    method: request.method,
    path: url.pathname,
    requestId,
    startTime: Date.now(),
    jwtToken
  }
  
  return context
}

/**
 * Log API request start with security context
 */
export function logApiRequest(
  context: ApiDebugContext, 
  params?: any,
  user?: any
): void {
  const userMetadata = extractUserMetadata(user, { businessId: context.businessId })
  
  debugAPI(
    `${context.method} ${context.path} - START`,
    {
      requestId: context.requestId,
      params: params || {},
      hasAuth: !!context.jwtToken,
      timestamp: new Date().toISOString()
    },
    {
      ...userMetadata,
      jwtToken: context.jwtToken
    }
  )
}

/**
 * Log API response with timing and context
 * This function is now completely safe and will never throw errors
 */
export function logApiResponse(
  context: ApiDebugContext,
  response: NextResponse | { status: number; data?: any },
  user?: any
): void {
  try {
    const duration = Date.now() - context.startTime
    const userMetadata = extractUserMetadata(user, { businessId: context.businessId })
    
    // Safely extract response data with fallbacks
    let responseData: any = {}
    let status = 200
    
    try {
      if (response instanceof NextResponse) {
        status = response.status || 200
        // Don't try to parse response body as it may be consumed
      } else if (response && typeof response === 'object' && 'status' in response) {
        status = response.status || 200
        responseData = response.data || {}
      }
    } catch (extractError) {
      // If extraction fails, use safe defaults
      status = 200
      responseData = {}
    }
    
    let responseSize = 0
    try {
      responseSize = responseData ? JSON.stringify(responseData).length : 0
    } catch (sizeError) {
      responseSize = 0
    }
    
    debugAPI(
      `${context.method} ${context.path} - ${status}`,
      {
        requestId: context.requestId,
        status,
        duration: `${duration}ms`,
        success: status < 400,
        responseSize,
        timestamp: new Date().toISOString()
      },
      userMetadata
    )
  } catch (error) {
    // If all else fails, log the debug failure but never throw
    try {
      debugError(
        DebugContext.API,
        'Debug response logging failed',
        error instanceof Error ? error : new Error(String(error))
      )
    } catch (logError) {
      // Even error logging failed - completely silent fallback
      console.error('Critical debug failure in logApiResponse:', logError)
    }
  }
}

/**
 * Log API error with full context
 */
export function logApiError(
  context: ApiDebugContext,
  error: Error | any,
  user?: any
): void {
  const userMetadata = extractUserMetadata(user, { businessId: context.businessId })
  
  debugError(
    DebugContext.API,
    `${context.method} ${context.path} - ERROR`,
    error instanceof Error ? error : new Error(JSON.stringify(error)),
    userMetadata
  )
}

/**
 * Log authentication events in API routes
 */
export function logApiAuth(
  context: ApiDebugContext,
  event: 'attempt' | 'success' | 'failure',
  data?: any,
  user?: any
): void {
  const userMetadata = extractUserMetadata(user, { businessId: context.businessId })
  
  debugAuth(
    `${context.method} ${context.path} - AUTH ${event.toUpperCase()}`,
    {
      requestId: context.requestId,
      event,
      data: data || {},
      timestamp: new Date().toISOString()
    },
    {
      ...userMetadata,
      jwtToken: context.jwtToken
    }
  )
}

/**
 * Higher-order function to wrap API route handlers with debugging
 */
export function withApiDebug<T extends any[]>(
  handler: (request: NextRequest, context: ApiDebugContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const debugContext = createApiDebugContext(request)
    
    try {
      // Log request start
      logApiRequest(debugContext)
      
      // Execute handler
      const response = await handler(request, debugContext, ...args)
      
      // Log response
      logApiResponse(debugContext, response)
      
      return response
    } catch (error) {
      // Log error
      logApiError(debugContext, error)
      
      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          requestId: debugContext.requestId
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes with authentication debugging
 * Now ensures debug operations never interfere with successful responses
 */
export function withAuthenticatedApiDebug<T extends any[]>(
  handler: (request: NextRequest, context: ApiDebugContext, user: any, ...args: T) => Promise<NextResponse>,
  getUserFn: (request: NextRequest) => Promise<any>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const debugContext = createApiDebugContext(request)
    let actualResponse: NextResponse | null = null
    
    try {
      // Safe debug logging - request start
      try {
        logApiRequest(debugContext)
      } catch (debugError) {
        // Debug logging failed, but continue with actual logic
        console.error('Debug request logging failed:', debugError)
      }
      
      // Authenticate user
      try {
        logApiAuth(debugContext, 'attempt')
      } catch (debugError) {
        console.error('Debug auth attempt logging failed:', debugError)
      }
      
      const user = await getUserFn(request)
      
      if (!user) {
        try {
          logApiAuth(debugContext, 'failure', { reason: 'No user found' })
        } catch (debugError) {
          console.error('Debug auth failure logging failed:', debugError)
        }
        
        const response = NextResponse.json(
          { success: false, error: 'Not authenticated', requestId: debugContext.requestId },
          { status: 401 }
        )
        
        // Safe debug logging - response
        try {
          logApiResponse(debugContext, response)
        } catch (debugError) {
          console.error('Debug response logging failed:', debugError)
        }
        
        return response
      }
      
      try {
        logApiAuth(debugContext, 'success', { userId: user.id, role: user.role })
      } catch (debugError) {
        console.error('Debug auth success logging failed:', debugError)
      }
      
      // Update debug context with user info
      debugContext.userId = user.id
      debugContext.businessId = user.businessId || user.currentBusinessId
      
      // Execute handler - THIS IS THE CRITICAL PART THAT MUST SUCCEED
      actualResponse = await handler(request, debugContext, user, ...args)
      
      // Safe debug logging - response (never let this fail the actual response)
      try {
        logApiResponse(debugContext, actualResponse, user)
      } catch (debugError) {
        console.error('Debug response logging failed:', debugError)
        // Continue anyway - actualResponse is still valid
      }
      
      return actualResponse
    } catch (error) {
      // This catch block should only handle actual handler/authentication errors
      // NOT debug logging errors (which are now safely caught above)
      
      try {
        logApiError(debugContext, error)
      } catch (debugError) {
        console.error('Debug error logging failed:', debugError)
      }
      
      // Only return error response if the actual handler failed
      // If we have a successful actualResponse but debug logging failed, return actualResponse
      if (actualResponse) {
        console.warn('Debug operation failed but handler succeeded, returning actual response')
        return actualResponse
      }
      
      // Return error response only if handler actually failed
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          requestId: debugContext.requestId
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Extract business context from request (query params, body, etc.)
 */
export function extractBusinessContext(request: NextRequest): {
  businessId?: string
  companyId?: string
} {
  const url = new URL(request.url)
  const businessId = url.searchParams.get('businessId') || 
                    url.searchParams.get('business_id')
  const companyId = url.searchParams.get('companyId') ||
                   url.searchParams.get('company_id')
  
  return {
    businessId: businessId || undefined,
    companyId: companyId || undefined
  }
}

/**
 * Validate and log business access in API routes
 */
export function logBusinessAccess(
  context: ApiDebugContext,
  businessId: string,
  hasAccess: boolean,
  user?: any
): void {
  const userMetadata = extractUserMetadata(user, { businessId })
  
  debugAPI(
    `${context.method} ${context.path} - BUSINESS ACCESS`,
    {
      requestId: context.requestId,
      businessId,
      hasAccess,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    },
    userMetadata
  )
}