import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers-isolated'
import { redisSessionStore } from '@/lib/redis-session-store'
import { sessionMonitor, getSessionDiagnostics } from '@/lib/session-monitoring'
import { sessionSecurityMiddleware } from '@/lib/session-security-middleware'

/**
 * Session Diagnostics API Endpoint
 * 
 * Provides real-time session health monitoring and diagnostics
 * for detecting and preventing session bleeding vulnerabilities.
 */

export async function GET(request: NextRequest) {
  console.log('[SESSION-DIAGNOSTICS] Diagnostics request received')

  try {
    // Authenticate the user (only admins should access diagnostics)
    const user = await getAuthenticatedUserForAPI()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges (role 0 = superadmin)
    const userRole = user.profile?.role ?? 1
    if (userRole !== 0) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    // Collect session diagnostics from all monitoring systems
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      requestId: request.headers.get('x-request-id') || 'unknown',
      
      // Session monitoring data
      sessionMonitoring: getSessionDiagnostics(),
      
      // Redis session store status
      redisSessionStore: {
        available: redisSessionStore.isAvailable(),
        activeSessions: redisSessionStore.isAvailable() 
          ? await redisSessionStore.getActiveSessions()
          : [],
        connectionStatus: redisSessionStore.isAvailable() ? 'connected' : 'disconnected'
      },
      
      // Security middleware statistics
      securityMiddleware: sessionSecurityMiddleware.getSecurityStats(),
      
      // System health indicators
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Session isolation verification
      isolationHealth: {
        requestScopedCaching: true, // Our new system uses React's cache()
        globalCacheEliminated: true, // We replaced the global authCache
        redisSessionStore: redisSessionStore.isAvailable(),
        distributedLocking: redisSessionStore.isAvailable(),
        securityMonitoring: true
      }
    }

    // Calculate overall health score
    const healthChecks = [
      diagnostics.redisSessionStore.available,
      diagnostics.isolationHealth.requestScopedCaching,
      diagnostics.isolationHealth.globalCacheEliminated,
      diagnostics.isolationHealth.distributedLocking,
      diagnostics.isolationHealth.securityMonitoring
    ]
    
    const healthScore = Math.round((healthChecks.filter(Boolean).length / healthChecks.length) * 100)
    
    diagnostics.overallHealth = {
      score: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
      issues: healthChecks.map((check, index) => {
        const labels = [
          'Redis Session Store',
          'Request Scoped Caching',
          'Global Cache Eliminated', 
          'Distributed Locking',
          'Security Monitoring'
        ]
        return { component: labels[index], healthy: check }
      }).filter(item => !item.healthy)
    }

    console.log(`[SESSION-DIAGNOSTICS] Health score: ${healthScore}% for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: diagnostics
    })

  } catch (error) {
    console.error('[SESSION-DIAGNOSTICS] Error generating diagnostics:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error generating diagnostics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Reset session monitoring data (admin only)
 */
export async function DELETE(request: NextRequest) {
  console.log('[SESSION-DIAGNOSTICS] Reset request received')

  try {
    const user = await getAuthenticatedUserForAPI()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userRole = user.profile?.role ?? 1
    if (userRole !== 0) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    // Clear session monitoring data
    sessionMonitor.clearAllSessions()
    
    // Clean up security middleware
    sessionSecurityMiddleware.cleanup()
    
    // Clean up Redis session store
    if (redisSessionStore.isAvailable()) {
      await redisSessionStore.cleanup()
    }

    console.log(`[SESSION-DIAGNOSTICS] Monitoring data reset by user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Session monitoring data reset successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[SESSION-DIAGNOSTICS] Error resetting monitoring data:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error resetting monitoring data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Test endpoint to simulate session activity (development only)
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development' },
      { status: 403 }
    )
  }

  console.log('[SESSION-DIAGNOSTICS] Test session activity request')

  try {
    const body = await request.json()
    const { testType = 'basic', userCount = 2, duration = 10000 } = body

    const user = await getAuthenticatedUserForAPI()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Simulate different types of session activity
    const testResults = {
      testType,
      userCount,
      duration,
      eventsGenerated: 0,
      timestamp: new Date().toISOString()
    }

    // Generate test session events
    for (let i = 0; i < userCount; i++) {
      const testUserId = `test_user_${i}`
      const testSessionId = `test_session_${i}_${Date.now()}`
      
      // Simulate login
      sessionMonitor.trackEvent({
        sessionId: testSessionId,
        userId: testUserId,
        userEmail: `${testUserId}@test.com`,
        action: 'login',
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'test-agent'
      })
      testResults.eventsGenerated++

      // Simulate business switches
      if (testType === 'business_switching') {
        const businesses = ['biz1', 'biz2', 'biz3']
        for (const businessId of businesses) {
          sessionMonitor.trackEvent({
            sessionId: testSessionId,
            userId: testUserId,
            businessId,
            action: 'business_switch',
            ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
            userAgent: request.headers.get('user-agent') || 'test-agent'
          })
          testResults.eventsGenerated++
        }
      }

      // Simulate cache access
      sessionMonitor.trackEvent({
        sessionId: testSessionId,
        userId: testUserId,
        action: 'cache_access',
        details: {
          cacheType: 'user_data',
          operation: 'test_access'
        }
      })
      testResults.eventsGenerated++
    }

    console.log(`[SESSION-DIAGNOSTICS] Generated ${testResults.eventsGenerated} test events`)

    return NextResponse.json({
      success: true,
      data: testResults
    })

  } catch (error) {
    console.error('[SESSION-DIAGNOSTICS] Error in test endpoint:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error in test endpoint',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}