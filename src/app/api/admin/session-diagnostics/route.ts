/**
 * ADMIN SESSION DIAGNOSTICS API
 * 
 * Provides comprehensive session monitoring and diagnostics data
 * for investigating session bleeding vulnerabilities.
 * 
 * SECURITY: Only accessible by superadmins (role 0)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers-secure'
import { sessionDiagnostic } from '@/lib/session-diagnostics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getAuthenticatedUserForAPI()
    
    if (!user || user.profile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const userId = url.searchParams.get('userId')
    const severity = url.searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null

    switch (action) {
      case 'report':
        // Get comprehensive session report
        const report = sessionDiagnostic.getSessionReport()
        return NextResponse.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString()
        })

      case 'anomalies':
        // Get anomalies, optionally filtered by severity
        const anomalies = severity 
          ? sessionDiagnostic.getAnomaliesBySeverity(severity)
          : sessionDiagnostic.getSessionReport().anomalies
        
        return NextResponse.json({
          success: true,
          data: {
            anomalies,
            total: anomalies.length,
            severity: severity || 'all'
          }
        })

      case 'user':
        // Get diagnostics for specific user
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId parameter required for user action' },
            { status: 400 }
          )
        }

        const userDiagnostics = sessionDiagnostic.getUserDiagnostics(userId, 50)
        return NextResponse.json({
          success: true,
          data: {
            userId,
            diagnostics: userDiagnostics,
            total: userDiagnostics.length
          }
        })

      case 'compromised':
        // Check if session appears compromised
        const sessionId = url.searchParams.get('sessionId')
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId parameter required for compromised action' },
            { status: 400 }
          )
        }

        const isCompromised = sessionDiagnostic.isSessionCompromised(sessionId)
        return NextResponse.json({
          success: true,
          data: {
            sessionId,
            isCompromised,
            timestamp: new Date().toISOString()
          }
        })

      case 'clear':
        // Clear diagnostic data (for testing/reset)
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json(
            { success: false, error: 'Clear action only available in development' },
            { status: 403 }
          )
        }
        
        sessionDiagnostic.clearDiagnostics()
        return NextResponse.json({
          success: true,
          message: 'Diagnostic data cleared'
        })

      default:
        // Default to session report
        const defaultReport = sessionDiagnostic.getSessionReport()
        return NextResponse.json({
          success: true,
          data: defaultReport,
          availableActions: ['report', 'anomalies', 'user', 'compromised', 'clear'],
          timestamp: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('Error in session diagnostics API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await getAuthenticatedUserForAPI()
    
    if (!user || user.profile?.role !== 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'test_anomaly':
        // Test anomaly detection (development only)
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json(
            { success: false, error: 'Test actions only available in development' },
            { status: 403 }
          )
        }

        // Create test diagnostic entries to trigger anomaly detection
        const testUserId1 = 'test-user-1'
        const testUserId2 = 'test-user-2' 
        const testSessionId = 'test-session-shared'

        sessionDiagnostic.recordDiagnostic({
          sessionId: testSessionId,
          userId: testUserId1,
          userEmail: 'test1@example.com',
          businessId: 'test-business-1',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          path: '/api/admin/session-diagnostics',
          method: 'POST'
        }, request)

        // Simulate session bleeding by having different user with same session
        setTimeout(() => {
          sessionDiagnostic.recordDiagnostic({
            sessionId: testSessionId,
            userId: testUserId2,
            userEmail: 'test2@example.com', 
            businessId: 'test-business-2',
            ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            path: '/api/admin/session-diagnostics',
            method: 'POST'
          }, request)
        }, 100)

        return NextResponse.json({
          success: true,
          message: 'Test anomaly created - check diagnostics in a few seconds'
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in session diagnostics POST API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}