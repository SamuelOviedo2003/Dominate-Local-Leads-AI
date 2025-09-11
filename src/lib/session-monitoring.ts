/**
 * Session Monitoring and Alerting System
 * 
 * This module provides comprehensive session monitoring to detect and prevent
 * session bleeding vulnerabilities in production environments.
 */

interface SessionEvent {
  timestamp: string
  sessionId: string
  userId: string
  userEmail?: string
  businessId?: string
  action: 'login' | 'business_switch' | 'logout' | 'cache_access' | 'anomaly'
  ip?: string
  userAgent?: string
  details?: Record<string, any>
}

interface SessionAnomalyAlert {
  type: 'session_collision' | 'cache_contamination' | 'multiple_active' | 'suspicious_switch'
  userId: string
  details: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
}

class SessionMonitor {
  private static instance: SessionMonitor | null = null
  private activeSessions = new Map<string, SessionEvent>()
  private userSessions = new Map<string, Set<string>>()
  private recentEvents: SessionEvent[] = []
  private maxRecentEvents = 1000
  private alertCallbacks: ((alert: SessionAnomalyAlert) => void)[] = []

  public static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor()
    }
    return SessionMonitor.instance
  }

  /**
   * Register an alert callback for security team notifications
   */
  public onAlert(callback: (alert: SessionAnomalyAlert) => void) {
    this.alertCallbacks.push(callback)
  }

  /**
   * Track a session event
   */
  public trackEvent(event: Omit<SessionEvent, 'timestamp'>) {
    const sessionEvent: SessionEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }

    // Store in recent events (rolling buffer)
    this.recentEvents.push(sessionEvent)
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift()
    }

    // Track active sessions
    if (event.action === 'login') {
      this.activeSessions.set(event.sessionId, sessionEvent)
      
      // Track per-user sessions
      if (!this.userSessions.has(event.userId)) {
        this.userSessions.set(event.userId, new Set())
      }
      this.userSessions.get(event.userId)!.add(event.sessionId)
      
      this.checkForAnomalies(event)
    } else if (event.action === 'logout') {
      this.activeSessions.delete(event.sessionId)
      this.userSessions.get(event.userId)?.delete(event.sessionId)
    } else if (event.action === 'business_switch') {
      this.checkBusinessSwitchAnomalies(event)
    } else if (event.action === 'cache_access') {
      this.checkCacheAnomalies(event)
    }

    // Console logging for development
    console.log(`[SESSION-MONITOR] ${event.action.toUpperCase()}:`, {
      sessionId: event.sessionId.substring(0, 8) + '...',
      userId: event.userId.substring(0, 8) + '...',
      businessId: event.businessId,
      ip: event.ip,
      details: event.details
    })
  }

  /**
   * Check for session anomalies
   */
  private checkForAnomalies(event: SessionEvent) {
    // Check for multiple sessions from same user but different IPs
    const userSessions = Array.from(this.activeSessions.values())
      .filter(s => s.userId === event.userId)
    
    const differentIPs = userSessions.filter(s => s.ip && s.ip !== event.ip)
    
    if (differentIPs.length > 0) {
      this.raiseAlert({
        type: 'multiple_active',
        userId: event.userId,
        details: {
          currentIP: event.ip,
          otherIPs: differentIPs.map(s => s.ip),
          sessionCount: userSessions.length
        },
        severity: 'high',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Check for business switching anomalies
   */
  private checkBusinessSwitchAnomalies(event: SessionEvent) {
    // Check for rapid business switching (potential session confusion)
    const recentSwitches = this.recentEvents
      .filter(e => 
        e.userId === event.userId && 
        e.action === 'business_switch' &&
        Date.now() - new Date(e.timestamp).getTime() < 30000 // Last 30 seconds
      )
    
    if (recentSwitches.length >= 5) {
      this.raiseAlert({
        type: 'suspicious_switch',
        userId: event.userId,
        details: {
          switchCount: recentSwitches.length,
          businesses: recentSwitches.map(s => s.businessId),
          timeframe: '30 seconds'
        },
        severity: 'medium',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Check for cache-related anomalies
   */
  private checkCacheAnomalies(event: SessionEvent) {
    if (event.details?.cacheHit && event.details?.cacheMismatch) {
      this.raiseAlert({
        type: 'cache_contamination',
        userId: event.userId,
        details: {
          expectedUserId: event.userId,
          cachedUserId: event.details.cachedUserId,
          cacheKey: event.details.cacheKey
        },
        severity: 'critical',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Raise a security alert
   */
  private raiseAlert(alert: SessionAnomalyAlert) {
    console.error(`[SESSION-SECURITY-ALERT] ${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}:`, alert.details)
    
    // Notify registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('[SESSION-MONITOR] Error in alert callback:', error)
      }
    })
  }

  /**
   * Get session statistics for monitoring dashboard
   */
  public getSessionStats() {
    return {
      activeSessions: this.activeSessions.size,
      activeUsers: this.userSessions.size,
      recentEvents: this.recentEvents.length,
      multipleSessionUsers: Array.from(this.userSessions.entries())
        .filter(([_, sessions]) => sessions.size > 1).length
    }
  }

  /**
   * Clear all session data (for cleanup/reset)
   */
  public clearAllSessions() {
    this.activeSessions.clear()
    this.userSessions.clear()
    this.recentEvents = []
    console.log('[SESSION-MONITOR] All session data cleared')
  }

  /**
   * Get recent events for debugging
   */
  public getRecentEvents(count = 50): SessionEvent[] {
    return this.recentEvents.slice(-count)
  }
}

// Helper function to extract session/request context
export function extractRequestContext(request?: Request): Pick<SessionEvent, 'ip' | 'userAgent'> {
  if (!request) return {}

  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { ip, userAgent }
}

// Export singleton instance
export const sessionMonitor = SessionMonitor.getInstance()

// Helper functions for common monitoring tasks
export function trackLogin(sessionId: string, userId: string, userEmail: string, context?: Pick<SessionEvent, 'ip' | 'userAgent'>) {
  sessionMonitor.trackEvent({
    sessionId,
    userId,
    userEmail,
    action: 'login',
    ...context
  })
}

export function trackLogout(sessionId: string, userId: string, context?: Pick<SessionEvent, 'ip' | 'userAgent'>) {
  sessionMonitor.trackEvent({
    sessionId,
    userId,
    action: 'logout',
    ...context
  })
}

export function trackBusinessSwitch(sessionId: string, userId: string, businessId: string, context?: Pick<SessionEvent, 'ip' | 'userAgent'>) {
  sessionMonitor.trackEvent({
    sessionId,
    userId,
    businessId,
    action: 'business_switch',
    ...context
  })
}

export function trackCacheAccess(sessionId: string, userId: string, details: Record<string, any>, context?: Pick<SessionEvent, 'ip' | 'userAgent'>) {
  sessionMonitor.trackEvent({
    sessionId,
    userId,
    action: 'cache_access',
    details,
    ...context
  })
}

// Development-only functions
export function setupDevelopmentAlerts() {
  if (process.env.NODE_ENV !== 'development') return

  sessionMonitor.onAlert((alert) => {
    console.error(`🚨 [DEV-ALERT] Session Security Issue Detected:`, alert)
    
    if (alert.severity === 'critical') {
      console.error('❌ CRITICAL: Possible session bleeding detected!')
      console.error('Action required: Check session isolation immediately')
    }
  })
}

export function getSessionDiagnostics() {
  return {
    stats: sessionMonitor.getSessionStats(),
    recentEvents: sessionMonitor.getRecentEvents(20)
  }
}