/**
 * Session Security Middleware
 * 
 * Advanced middleware to detect, prevent, and monitor session bleeding vulnerabilities.
 * This sits between Supabase auth and the application to ensure proper session isolation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sessionMonitor, extractRequestContext } from '@/lib/session-monitoring'
import { redisSessionStore } from '@/lib/redis-session-store'
import { createHash, randomBytes } from 'crypto'

interface SecurityContext {
  requestId: string
  sessionId: string
  userId?: string
  userEmail?: string
  ipAddress: string
  userAgent: string
  timestamp: number
  fingerprint: string
}

interface SessionAnomalyDetection {
  userId: string
  sessionId: string
  anomalyType: 'ip_change' | 'concurrent_sessions' | 'rapid_switching' | 'fingerprint_mismatch'
  details: Record<string, any>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

class SessionSecurityMiddleware {
  private static instance: SessionSecurityMiddleware | null = null
  private recentRequests = new Map<string, SecurityContext[]>()
  private userSessions = new Map<string, Set<string>>()
  private maxRequestsPerUser = 100 // Keep last 100 requests per user
  
  public static getInstance(): SessionSecurityMiddleware {
    if (!SessionSecurityMiddleware.instance) {
      SessionSecurityMiddleware.instance = new SessionSecurityMiddleware()
    }
    return SessionSecurityMiddleware.instance
  }

  /**
   * Generate browser fingerprint for session validation
   */
  private generateFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}|${ip}`
    return createHash('sha256').update(data).digest('hex').substring(0, 16)
  }

  /**
   * Generate secure session ID
   */
  private generateSecureSessionId(): string {
    return `ses_${Date.now()}_${randomBytes(16).toString('hex')}`
  }

  /**
   * Extract and validate security context from request
   */
  private extractSecurityContext(request: NextRequest): SecurityContext {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const sessionId = request.cookies.get('session-id')?.value || this.generateSecureSessionId()
    
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const fingerprint = this.generateFingerprint(userAgent, ipAddress)
    
    return {
      requestId,
      sessionId,
      ipAddress,
      userAgent,
      fingerprint,
      timestamp: Date.now()
    }
  }

  /**
   * Detect session anomalies
   */
  private async detectAnomalies(context: SecurityContext, currentRequest?: NextRequest): Promise<SessionAnomalyDetection[]> {
    const anomalies: SessionAnomalyDetection[] = []
    
    if (!context.userId) return anomalies
    
    // Get user's recent requests
    const userRequests = this.recentRequests.get(context.userId) || []
    
    // Check for IP address changes
    const recentIPs = new Set(userRequests.map(r => r.ipAddress))
    if (recentIPs.size > 1 && !recentIPs.has(context.ipAddress)) {
      anomalies.push({
        userId: context.userId,
        sessionId: context.sessionId,
        anomalyType: 'ip_change',
        details: {
          currentIP: context.ipAddress,
          recentIPs: Array.from(recentIPs),
          timestamp: context.timestamp
        },
        riskLevel: 'high'
      })
    }
    
    // Check for concurrent sessions
    const userSessionIds = this.userSessions.get(context.userId) || new Set()
    if (userSessionIds.size > 3) { // Allow max 3 concurrent sessions
      anomalies.push({
        userId: context.userId,
        sessionId: context.sessionId,
        anomalyType: 'concurrent_sessions',
        details: {
          sessionCount: userSessionIds.size,
          sessionIds: Array.from(userSessionIds),
          timestamp: context.timestamp
        },
        riskLevel: 'medium'
      })
    }
    
    // Check for rapid business switching (potential session confusion)
    const recentBusinessSwitches = userRequests.filter(r => 
      r.timestamp > Date.now() - 30000 && // Last 30 seconds
      currentRequest?.nextUrl.pathname.includes('business-switch')
    ).length
    
    if (recentBusinessSwitches > 5) {
      anomalies.push({
        userId: context.userId,
        sessionId: context.sessionId,
        anomalyType: 'rapid_switching',
        details: {
          switchCount: recentBusinessSwitches,
          timeframe: '30 seconds',
          timestamp: context.timestamp
        },
        riskLevel: 'high'
      })
    }
    
    // Check for browser fingerprint mismatches
    const recentFingerprints = new Set(userRequests.map(r => r.fingerprint))
    if (recentFingerprints.size > 1 && !recentFingerprints.has(context.fingerprint)) {
      anomalies.push({
        userId: context.userId,
        sessionId: context.sessionId,
        anomalyType: 'fingerprint_mismatch',
        details: {
          currentFingerprint: context.fingerprint,
          recentFingerprints: Array.from(recentFingerprints),
          timestamp: context.timestamp
        },
        riskLevel: 'critical'
      })
    }
    
    return anomalies
  }

  /**
   * Handle detected anomalies
   */
  private async handleAnomalies(anomalies: SessionAnomalyDetection[], request: NextRequest): Promise<NextResponse | null> {
    for (const anomaly of anomalies) {
      // Log the anomaly
      console.error(`[SESSION-SECURITY] Anomaly detected:`, anomaly)
      
      // Track in monitoring system
      sessionMonitor.trackEvent({
        sessionId: anomaly.sessionId,
        userId: anomaly.userId,
        action: 'anomaly',
        details: {
          anomalyType: anomaly.anomalyType,
          riskLevel: anomaly.riskLevel,
          ...anomaly.details
        }
      })
      
      // Handle critical anomalies
      if (anomaly.riskLevel === 'critical') {
        console.error(`[SESSION-SECURITY] CRITICAL ANOMALY - Terminating session for user ${anomaly.userId}`)
        
        // Clear session in Redis
        await redisSessionStore.deleteSession(anomaly.userId)
        
        // Return redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('reason', 'security_violation')
        
        const response = NextResponse.redirect(url)
        response.cookies.delete('session-id')
        return response
      }
      
      // For high-risk anomalies, add security headers
      if (anomaly.riskLevel === 'high') {
        const response = NextResponse.next()
        response.headers.set('X-Security-Alert', 'session-anomaly-detected')
        response.headers.set('X-Session-Monitoring', 'enhanced')
        return response
      }
    }
    
    return null // No action needed
  }

  /**
   * Store security context for anomaly detection
   */
  private storeSecurityContext(context: SecurityContext) {
    if (!context.userId) return
    
    // Store request context
    const userRequests = this.recentRequests.get(context.userId) || []
    userRequests.push(context)
    
    // Keep only recent requests
    if (userRequests.length > this.maxRequestsPerUser) {
      userRequests.shift()
    }
    
    this.recentRequests.set(context.userId, userRequests)
    
    // Track user sessions
    if (!this.userSessions.has(context.userId)) {
      this.userSessions.set(context.userId, new Set())
    }
    this.userSessions.get(context.userId)!.add(context.sessionId)
  }

  /**
   * Validate session integrity with Redis
   */
  private async validateSessionIntegrity(context: SecurityContext): Promise<boolean> {
    if (!context.userId || !redisSessionStore.isAvailable()) {
      return true // Skip validation if Redis is not available
    }
    
    try {
      const sessionData = await redisSessionStore.getSession(context.userId)
      
      if (!sessionData) {
        console.warn(`[SESSION-SECURITY] No session data found for user ${context.userId}`)
        return false
      }
      
      // Validate IP address consistency
      if (sessionData.ipAddress && sessionData.ipAddress !== context.ipAddress) {
        console.warn(`[SESSION-SECURITY] IP address mismatch for user ${context.userId}`)
        return false
      }
      
      // Update session data with current context
      sessionData.ipAddress = context.ipAddress
      sessionData.userAgent = context.userAgent
      await redisSessionStore.setSession(context.userId, sessionData)
      
      return true
    } catch (error) {
      console.error('[SESSION-SECURITY] Error validating session integrity:', error)
      return true // Allow request to continue on error
    }
  }

  /**
   * Main middleware function
   */
  async processRequest(request: NextRequest): Promise<NextResponse> {
    const context = this.extractSecurityContext(request)
    
    // Create Supabase client
    let response = NextResponse.next()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Get authenticated user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (user) {
      context.userId = user.id
      context.userEmail = user.email
      
      // Validate session integrity with Redis
      const isValidSession = await this.validateSessionIntegrity(context)
      
      if (!isValidSession) {
        console.warn(`[SESSION-SECURITY] Invalid session detected for user ${user.id}`)
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('reason', 'session_invalid')
        
        response = NextResponse.redirect(url)
        response.cookies.delete('session-id')
        return response
      }
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(context, request)
      
      // Handle anomalies if detected
      if (anomalies.length > 0) {
        const anomalyResponse = await this.handleAnomalies(anomalies, request)
        if (anomalyResponse) {
          return anomalyResponse
        }
      }
      
      // Store security context for future anomaly detection
      this.storeSecurityContext(context)
    }
    
    // Add security headers
    response.headers.set('X-Request-ID', context.requestId)
    response.headers.set('X-Session-ID', context.sessionId)
    response.headers.set('X-Security-Context', 'monitored')
    
    // Set secure session cookie
    response.cookies.set('session-id', context.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    })
    
    return response
  }

  /**
   * Clean up old security contexts
   */
  cleanup() {
    const now = Date.now()
    const maxAge = 3600000 // 1 hour
    
    for (const [userId, requests] of this.recentRequests.entries()) {
      const validRequests = requests.filter(r => now - r.timestamp < maxAge)
      
      if (validRequests.length === 0) {
        this.recentRequests.delete(userId)
        this.userSessions.delete(userId)
      } else {
        this.recentRequests.set(userId, validRequests)
      }
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      trackedUsers: this.recentRequests.size,
      totalRequests: Array.from(this.recentRequests.values()).reduce((sum, requests) => sum + requests.length, 0),
      activeSessions: Array.from(this.userSessions.values()).reduce((sum, sessions) => sum + sessions.size, 0)
    }
  }
}

// Export singleton instance
export const sessionSecurityMiddleware = SessionSecurityMiddleware.getInstance()

// Enhanced middleware function that integrates with existing middleware
export async function enhancedSessionMiddleware(request: NextRequest): Promise<NextResponse> {
  return await sessionSecurityMiddleware.processRequest(request)
}

// Cleanup function to run periodically
export function startSecurityCleanup() {
  setInterval(() => {
    sessionSecurityMiddleware.cleanup()
  }, 300000) // Clean up every 5 minutes
}