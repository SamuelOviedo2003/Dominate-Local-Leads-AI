/**
 * ENHANCED SESSION SECURITY MIDDLEWARE
 * 
 * This middleware provides comprehensive session security monitoring
 * and prevents session bleeding by validating session integrity on every request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordSessionDiagnostic, sessionDiagnostic } from '@/lib/session-diagnostics'
import { redisSessionStore } from '@/lib/redis-session-store'

interface SessionValidationResult {
  isValid: boolean
  userId?: string
  userEmail?: string
  businessId?: string
  errors?: string[]
  shouldTerminate?: boolean
}

class EnhancedSessionMiddleware {
  private static readonly PROTECTED_PATHS = [
    '/dashboard',
    '/new-leads',
    '/lead-details',
    '/incoming-calls',
    '/bookings',
    '/settings',
    '/api/'
  ]

  private static readonly ADMIN_PATHS = [
    '/api/admin/',
    '/api/system/'
  ]

  /**
   * Check if path requires session validation
   */
  private static requiresSessionValidation(path: string): boolean {
    return this.PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))
  }

  /**
   * Check if path requires admin access
   */
  private static requiresAdminAccess(path: string): boolean {
    return this.ADMIN_PATHS.some(adminPath => path.startsWith(adminPath))
  }

  /**
   * Extract session information from request
   */
  private static async extractSessionInfo(request: NextRequest): Promise<{
    supabaseUser: any
    sessionId: string
    cookies: string
  }> {
    try {
      // Get Supabase client for session validation
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      // Extract session identifier from cookies
      const cookies = request.headers.get('cookie') || ''
      const sessionId = this.extractSessionIdFromCookies(cookies) || 
                       request.headers.get('x-session-id') || 
                       'unknown'

      return {
        supabaseUser: error ? null : user,
        sessionId,
        cookies
      }
    } catch (error) {
      console.error('[SESSION-MIDDLEWARE] Error extracting session info:', error)
      return {
        supabaseUser: null,
        sessionId: 'unknown',
        cookies: ''
      }
    }
  }

  /**
   * Extract session ID from cookie string
   */
  private static extractSessionIdFromCookies(cookies: string): string | null {
    try {
      // Look for Supabase session cookies
      const cookiePattern = /(?:supabase-auth-token|sb-[^=]+-auth-token)=([^;]+)/
      const match = cookies.match(cookiePattern)
      if (match) {
        // Extract a portion of the token as session identifier
        const token = match[1]
        return `session_${token.substring(0, 16)}...${token.slice(-8)}`
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Validate session integrity and detect anomalies
   */
  private static async validateSession(request: NextRequest): Promise<SessionValidationResult> {
    const { supabaseUser, sessionId, cookies } = await this.extractSessionInfo(request)

    const validation: SessionValidationResult = {
      isValid: false,
      errors: []
    }

    // Basic authentication check
    if (!supabaseUser || !supabaseUser.id) {
      validation.errors!.push('No authenticated user found')
      return validation
    }

    validation.userId = supabaseUser.id
    validation.userEmail = supabaseUser.email

    // Check if session appears compromised based on recent anomalies
    if (sessionDiagnostic.isSessionCompromised(sessionId)) {
      validation.errors!.push('Session appears compromised based on anomaly detection')
      validation.shouldTerminate = true
      return validation
    }

    // Additional security checks for admin paths
    if (this.requiresAdminAccess(request.nextUrl.pathname)) {
      try {
        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', supabaseUser.id)
          .single()

        if (!profile || profile.role !== 0) {
          validation.errors!.push('Admin access required')
          validation.shouldTerminate = true
          return validation
        }
      } catch (error) {
        validation.errors!.push('Failed to verify admin privileges')
        return validation
      }
    }

    // Extract business context from URL
    const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean)
    if (pathSegments.length > 0 && !pathSegments[0].startsWith('api')) {
      validation.businessId = pathSegments[0] // Assuming first segment is business permalink
    }

    // Redis session validation (if available)
    if (redisSessionStore.isAvailable()) {
      try {
        const redisSession = await redisSessionStore.getSession(supabaseUser.id)
        if (redisSession) {
          // Validate Redis session matches current request
          if (redisSession.userId !== supabaseUser.id) {
            validation.errors!.push('Redis session user mismatch')
            validation.shouldTerminate = true
            return validation
          }
        }
      } catch (error) {
        console.warn('[SESSION-MIDDLEWARE] Redis session validation failed:', error)
        // Don't fail validation due to Redis issues, but log it
      }
    }

    validation.isValid = validation.errors!.length === 0
    return validation
  }

  /**
   * Main middleware function
   */
  public static async process(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    
    // Skip validation for non-protected paths
    if (!this.requiresSessionValidation(request.nextUrl.pathname)) {
      return NextResponse.next()
    }

    console.log(`[SESSION-MIDDLEWARE] Validating: ${request.method} ${request.nextUrl.pathname}`)

    try {
      // Validate session
      const validation = await this.validateSession(request)

      // Record diagnostic information
      if (validation.userId) {
        recordSessionDiagnostic(
          validation.userId,
          validation.userId, // Use userId as sessionId fallback
          validation.businessId,
          validation.userEmail,
          request
        )
      }

      // Handle session termination
      if (validation.shouldTerminate) {
        console.error('[SESSION-MIDDLEWARE] Session terminated:', validation.errors)
        
        // Clear session and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url))
        
        // Clear all auth cookies
        response.cookies.delete('supabase-auth-token')
        response.cookies.getAll().forEach(cookie => {
          if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
            response.cookies.delete(cookie.name)
          }
        })

        return response
      }

      // Handle invalid session
      if (!validation.isValid) {
        console.warn('[SESSION-MIDDLEWARE] Invalid session:', validation.errors)
        
        // For API routes, return 401
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Session validation failed',
              details: validation.errors
            },
            { status: 401 }
          )
        }

        // For pages, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Session is valid - continue with enhanced headers
      const response = NextResponse.next()
      
      // Add security headers
      response.headers.set('X-Session-Validated', 'true')
      response.headers.set('X-Process-ID', process.pid.toString())
      response.headers.set('X-Request-ID', `req_${startTime}_${Math.random().toString(36).substring(2)}`)
      
      if (validation.userId) {
        response.headers.set('X-User-ID', validation.userId.substring(0, 16) + '...')
      }

      // Performance monitoring
      const processingTime = Date.now() - startTime
      response.headers.set('X-Session-Validation-Time', processingTime.toString())

      if (processingTime > 1000) {
        console.warn(`[SESSION-MIDDLEWARE] Slow validation: ${processingTime}ms for ${request.nextUrl.pathname}`)
      }

      console.log(`[SESSION-MIDDLEWARE] ✅ Valid session: ${validation.userId?.substring(0, 8)}... (${processingTime}ms)`)

      return response

    } catch (error) {
      console.error('[SESSION-MIDDLEWARE] Validation error:', error)
      
      // On error, be conservative - redirect to login for safety
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Session validation error' },
          { status: 500 }
        )
      }

      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
}

// Export the main middleware function
export async function enhancedSessionMiddleware(request: NextRequest): Promise<NextResponse> {
  return EnhancedSessionMiddleware.process(request)
}

// Security cleanup function to run periodically
export function startSecurityCleanup(): void {
  console.log('[SESSION-MIDDLEWARE] Starting security cleanup processes')
  
  // Clean up Redis sessions periodically
  if (redisSessionStore.isAvailable()) {
    setInterval(async () => {
      try {
        await redisSessionStore.cleanup()
      } catch (error) {
        console.error('[SESSION-MIDDLEWARE] Redis cleanup error:', error)
      }
    }, 300000) // Every 5 minutes
  }

  // Log session statistics periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const report = sessionDiagnostic.getSessionReport()
      const criticalAnomalies = sessionDiagnostic.getAnomaliesBySeverity('critical').length
      
      console.log(`[SESSION-MIDDLEWARE] Stats: ${report.activeUsers} users, ${report.totalSessions} sessions, ${criticalAnomalies} critical anomalies`)
    }, 60000) // Every minute in development
  }
}