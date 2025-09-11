/**
 * CRITICAL SESSION BLEEDING DIAGNOSTIC SYSTEM
 * 
 * This comprehensive diagnostic system will help identify and prevent
 * session bleeding vulnerabilities in real-time production environments.
 * 
 * Deploy this immediately to start monitoring session integrity.
 */

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Diagnostic data structures
interface SessionDiagnostic {
  timestamp: string
  sessionId: string
  userId: string
  userEmail?: string
  businessId?: string
  processId: string
  workerId?: string
  requestId: string
  ip: string
  userAgent: string
  path: string
  method: string
  // Critical diagnostic fields
  supabaseSessionId?: string
  jwtToken?: string
  cookieFingerprint: string
  headerFingerprint: string
}

interface SessionAnomaly {
  type: 'session_hijack' | 'cross_user_contamination' | 'business_context_leak' | 'cookie_collision'
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  affectedUsers: string[]
  evidence: Record<string, any>
  recommendation: string
}

interface SessionReport {
  totalSessions: number
  activeUsers: number
  anomalies: SessionAnomaly[]
  diagnostics: SessionDiagnostic[]
  systemInfo: {
    nodeVersion: string
    processId: string
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
  }
}

class SessionDiagnosticSystem {
  private static instance: SessionDiagnosticSystem | null = null
  private diagnostics: SessionDiagnostic[] = []
  private anomalies: SessionAnomaly[] = []
  private userSessions: Map<string, Set<string>> = new Map()
  private sessionUsers: Map<string, string> = new Map()
  private maxDiagnostics = 5000 // Keep last 5000 entries

  public static getInstance(): SessionDiagnosticSystem {
    if (!SessionDiagnosticSystem.instance) {
      SessionDiagnosticSystem.instance = new SessionDiagnosticSystem()
    }
    return SessionDiagnosticSystem.instance
  }

  /**
   * Generate a fingerprint from request headers for session validation
   */
  private generateFingerprint(headersList: any): string {
    try {
      const userAgent = headersList.get('user-agent') || ''
      const acceptLanguage = headersList.get('accept-language') || ''
      const acceptEncoding = headersList.get('accept-encoding') || ''
      const accept = headersList.get('accept') || ''
      
      const data = `${userAgent}:${acceptLanguage}:${acceptEncoding}:${accept}`
      // Simple hash function for fingerprinting
      let hash = 0
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36)
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Generate cookie fingerprint for session validation
   */
  private generateCookieFingerprint(headersList: any): string {
    try {
      const cookies = headersList.get('cookie') || ''
      // Extract session-related cookie names/structure (not values for security)
      const cookieNames = cookies.split(';')
        .map(c => c.trim().split('=')[0])
        .sort()
        .join(',')
      return cookieNames
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * Extract diagnostic information from request
   */
  private extractRequestDiagnostic(request: NextRequest): Pick<SessionDiagnostic, 'ip' | 'userAgent' | 'path' | 'method' | 'cookieFingerprint' | 'headerFingerprint'> {
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const path = request.nextUrl.pathname
    const method = request.method

    const cookieFingerprint = this.generateCookieFingerprint(request.headers)
    const headerFingerprint = this.generateFingerprint(request.headers)

    return {
      ip,
      userAgent,
      path,
      method,
      cookieFingerprint,
      headerFingerprint
    }
  }

  /**
   * Record a session diagnostic entry
   */
  public recordDiagnostic(data: Omit<SessionDiagnostic, 'timestamp' | 'processId' | 'requestId' | 'cookieFingerprint' | 'headerFingerprint'>, request?: NextRequest): void {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const processId = process.pid.toString()
    
    let requestData = {
      ip: 'unknown',
      userAgent: 'unknown',
      path: '/unknown',
      method: 'UNKNOWN',
      cookieFingerprint: 'unknown',
      headerFingerprint: 'unknown'
    }

    if (request) {
      requestData = this.extractRequestDiagnostic(request)
    }

    const diagnostic: SessionDiagnostic = {
      ...data,
      ...requestData,
      timestamp: new Date().toISOString(),
      processId,
      requestId,
      workerId: process.env.WORKER_ID || process.env.HOSTNAME || 'unknown'
    }

    // Store diagnostic
    this.diagnostics.push(diagnostic)
    
    // Maintain rolling buffer
    if (this.diagnostics.length > this.maxDiagnostics) {
      this.diagnostics.shift()
    }

    // Update session tracking
    this.updateSessionTracking(diagnostic)

    // Check for anomalies
    this.checkForAnomalies(diagnostic)

    // Log for immediate visibility
    console.log(`[SESSION-DIAGNOSTIC] ${data.userId?.substring(0, 8)}... @ ${data.businessId || 'no-biz'} | ${requestData.path} | ${requestData.ip}`)
  }

  /**
   * Update internal session tracking
   */
  private updateSessionTracking(diagnostic: SessionDiagnostic): void {
    // Track user sessions
    if (!this.userSessions.has(diagnostic.userId)) {
      this.userSessions.set(diagnostic.userId, new Set())
    }
    this.userSessions.get(diagnostic.userId)!.add(diagnostic.sessionId)

    // Track session users
    const existingUser = this.sessionUsers.get(diagnostic.sessionId)
    if (existingUser && existingUser !== diagnostic.userId) {
      // CRITICAL: Same session ID, different user!
      this.raiseAnomaly({
        type: 'session_hijack',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        affectedUsers: [existingUser, diagnostic.userId],
        evidence: {
          sessionId: diagnostic.sessionId,
          previousUser: existingUser,
          currentUser: diagnostic.userId,
          ip: diagnostic.ip,
          userAgent: diagnostic.userAgent,
          path: diagnostic.path
        },
        recommendation: 'IMMEDIATE ACTION REQUIRED: Session hijacking detected. Invalidate all sessions and investigate security breach.'
      })
    }
    
    this.sessionUsers.set(diagnostic.sessionId, diagnostic.userId)
  }

  /**
   * Check for session anomalies
   */
  private checkForAnomalies(diagnostic: SessionDiagnostic): void {
    this.checkCrossUserContamination(diagnostic)
    this.checkBusinessContextLeaks(diagnostic)
    this.checkCookieCollisions(diagnostic)
    this.checkMultipleSessionsFromSameIP(diagnostic)
  }

  /**
   * Check for cross-user contamination
   */
  private checkCrossUserContamination(diagnostic: SessionDiagnostic): void {
    // Look for recent diagnostics with same session but different user
    const recentSameSession = this.diagnostics
      .slice(-100) // Check last 100 entries
      .filter(d => 
        d.sessionId === diagnostic.sessionId && 
        d.userId !== diagnostic.userId &&
        Date.now() - new Date(d.timestamp).getTime() < 30000 // Last 30 seconds
      )

    if (recentSameSession.length > 0) {
      this.raiseAnomaly({
        type: 'cross_user_contamination',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        affectedUsers: [diagnostic.userId, ...recentSameSession.map(d => d.userId)],
        evidence: {
          sessionId: diagnostic.sessionId,
          currentUser: diagnostic.userId,
          previousUsers: recentSameSession.map(d => ({ userId: d.userId, timestamp: d.timestamp })),
          ipMismatch: recentSameSession.some(d => d.ip !== diagnostic.ip)
        },
        recommendation: 'Session bleeding detected. Check session store isolation and clear user sessions immediately.'
      })
    }
  }

  /**
   * Check for business context leaks between users
   */
  private checkBusinessContextLeaks(diagnostic: SessionDiagnostic): void {
    if (!diagnostic.businessId) return

    // Check if different users are accessing the same business context suspiciously quickly
    const recentBusinessAccess = this.diagnostics
      .slice(-50)
      .filter(d => 
        d.businessId === diagnostic.businessId &&
        d.userId !== diagnostic.userId &&
        Date.now() - new Date(d.timestamp).getTime() < 10000 // Last 10 seconds
      )

    if (recentBusinessAccess.length > 0) {
      this.raiseAnomaly({
        type: 'business_context_leak',
        severity: 'high',
        timestamp: new Date().toISOString(),
        affectedUsers: [diagnostic.userId, ...recentBusinessAccess.map(d => d.userId)],
        evidence: {
          businessId: diagnostic.businessId,
          currentUser: diagnostic.userId,
          recentUsers: recentBusinessAccess.map(d => ({ userId: d.userId, timestamp: d.timestamp, ip: d.ip })),
          timeframe: '10 seconds'
        },
        recommendation: 'Potential business context leak. Verify business switching permissions and session isolation.'
      })
    }
  }

  /**
   * Check for cookie collisions
   */
  private checkCookieCollisions(diagnostic: SessionDiagnostic): void {
    // Look for different users with identical cookie fingerprints
    const sameCookieFingerprint = this.diagnostics
      .slice(-200)
      .filter(d => 
        d.cookieFingerprint === diagnostic.cookieFingerprint &&
        d.userId !== diagnostic.userId &&
        Date.now() - new Date(d.timestamp).getTime() < 60000 // Last minute
      )

    if (sameCookieFingerprint.length > 0) {
      this.raiseAnomaly({
        type: 'cookie_collision',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        affectedUsers: [diagnostic.userId, ...sameCookieFingerprint.map(d => d.userId)],
        evidence: {
          cookieFingerprint: diagnostic.cookieFingerprint,
          currentUser: diagnostic.userId,
          conflictingUsers: sameCookieFingerprint.map(d => ({ userId: d.userId, timestamp: d.timestamp }))
        },
        recommendation: 'Cookie structure collision detected. Investigate session cookie generation and ensure proper isolation.'
      })
    }
  }

  /**
   * Check for suspicious multiple sessions from same IP
   */
  private checkMultipleSessionsFromSameIP(diagnostic: SessionDiagnostic): void {
    const sameIPDifferentUsers = this.diagnostics
      .slice(-100)
      .filter(d => 
        d.ip === diagnostic.ip &&
        d.userId !== diagnostic.userId &&
        Date.now() - new Date(d.timestamp).getTime() < 120000 // Last 2 minutes
      )

    // Only flag if more than 3 different users from same IP in short timeframe
    if (sameIPDifferentUsers.length >= 3) {
      const uniqueUsers = new Set(sameIPDifferentUsers.map(d => d.userId))
      if (uniqueUsers.size >= 3) {
        this.raiseAnomaly({
          type: 'session_hijack',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          affectedUsers: [diagnostic.userId, ...Array.from(uniqueUsers)],
          evidence: {
            ip: diagnostic.ip,
            userCount: uniqueUsers.size + 1,
            timeframe: '2 minutes',
            users: Array.from(uniqueUsers)
          },
          recommendation: 'Multiple users from same IP detected. Could indicate session sharing, load testing, or security issue.'
        })
      }
    }
  }

  /**
   * Raise a session anomaly alert
   */
  private raiseAnomaly(anomaly: SessionAnomaly): void {
    this.anomalies.push(anomaly)
    
    // Log immediately for visibility
    console.error(`🚨 [SESSION-ANOMALY-${anomaly.severity.toUpperCase()}] ${anomaly.type.toUpperCase()}:`, {
      affectedUsers: anomaly.affectedUsers.length,
      evidence: Object.keys(anomaly.evidence),
      recommendation: anomaly.recommendation.substring(0, 100) + '...'
    })

    // Keep only recent anomalies
    if (this.anomalies.length > 1000) {
      this.anomalies = this.anomalies.slice(-500)
    }
  }

  /**
   * Get comprehensive session report
   */
  public getSessionReport(): SessionReport {
    const activeUsers = this.userSessions.size
    const totalSessions = this.sessionUsers.size

    return {
      totalSessions,
      activeUsers,
      anomalies: this.anomalies.slice(-50), // Last 50 anomalies
      diagnostics: this.diagnostics.slice(-100), // Last 100 diagnostics
      systemInfo: {
        nodeVersion: process.version,
        processId: process.pid.toString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    }
  }

  /**
   * Get anomalies by severity
   */
  public getAnomaliesBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SessionAnomaly[] {
    return this.anomalies.filter(a => a.severity === severity)
  }

  /**
   * Clear all diagnostic data (for testing/reset)
   */
  public clearDiagnostics(): void {
    this.diagnostics = []
    this.anomalies = []
    this.userSessions.clear()
    this.sessionUsers.clear()
    console.log('[SESSION-DIAGNOSTIC] All diagnostic data cleared')
  }

  /**
   * Get recent diagnostics for a specific user
   */
  public getUserDiagnostics(userId: string, limit: number = 20): SessionDiagnostic[] {
    return this.diagnostics
      .filter(d => d.userId === userId)
      .slice(-limit)
  }

  /**
   * Check if a session appears to be compromised
   */
  public isSessionCompromised(sessionId: string): boolean {
    return this.anomalies.some(a => 
      (a.type === 'session_hijack' || a.type === 'cross_user_contamination') &&
      a.evidence.sessionId === sessionId &&
      Date.now() - new Date(a.timestamp).getTime() < 300000 // Last 5 minutes
    )
  }
}

// Export singleton
export const sessionDiagnostic = SessionDiagnosticSystem.getInstance()

// Helper function for middleware integration
export function recordSessionDiagnostic(
  userId: string,
  sessionId: string,
  businessId: string | undefined,
  userEmail: string | undefined,
  request: NextRequest
) {
  sessionDiagnostic.recordDiagnostic({
    sessionId,
    userId,
    userEmail,
    businessId
  }, request)
}

// Development helper
export function setupDevelopmentDiagnostics() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Session diagnostics system initialized for development')
    
    // Log anomalies immediately in development
    setInterval(() => {
      const report = sessionDiagnostic.getSessionReport()
      const criticalAnomalies = sessionDiagnostic.getAnomaliesBySeverity('critical')
      
      if (criticalAnomalies.length > 0) {
        console.error('🚨 CRITICAL SESSION ANOMALIES DETECTED:', criticalAnomalies.length)
        criticalAnomalies.forEach(anomaly => {
          console.error(`   - ${anomaly.type}: ${anomaly.recommendation}`)
        })
      }
    }, 10000) // Check every 10 seconds in development
  }
}