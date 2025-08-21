import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { DashboardMetrics } from '@/types/leads'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/platform-spend
 * Fetches total platform spend from ad_spends table for dashboard metrics
 * 
 * Query Parameters:
 * - startDate: ISO string for filtering ad spends created after this date
 * - businessId: Business ID to filter ad spends
 * 
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - JSON response with platform spend data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile?.business_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const businessIdParam = searchParams.get('businessId')

    if (!startDate || !businessIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and businessId' },
        { status: 400 }
      )
    }

    // Convert businessId to number since database expects smallint
    const requestedBusinessId = parseInt(businessIdParam, 10)
    if (isNaN(requestedBusinessId)) {
      return NextResponse.json(
        { error: 'businessId must be a valid number' },
        { status: 400 }
      )
    }

    // Ensure user can only access their own business data (unless Super Admin)
    const userBusinessId = parseInt(user.profile.business_id, 10)
    if (user.profile.role !== 0 && requestedBusinessId !== userBusinessId) {
      return NextResponse.json(
        { error: 'Access denied - You can only access your own business data' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch ad spends data for platform spend calculation
    const { data: adSpends, error } = await supabase
      .from('ad_spends')
      .select('spend')
      .gte('created_at', startDate)
      .eq('business_id', requestedBusinessId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ad spends data' },
        { status: 500 }
      )
    }

    // Calculate total platform spend
    const totalPlatformSpend = adSpends.reduce((sum, spend) => {
      return sum + (spend.spend || 0)
    }, 0)

    const metrics: DashboardMetrics = {
      platformSpend: Math.round(totalPlatformSpend * 100) / 100
    }

    return NextResponse.json({
      data: metrics,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}