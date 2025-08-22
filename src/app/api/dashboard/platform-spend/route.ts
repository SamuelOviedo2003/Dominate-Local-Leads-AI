import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { EnhancedDashboardMetrics, PlatformSpend } from '@/types/leads'

export const dynamic = 'force-dynamic'

/**
 * Normalizes platform names for consistent display
 * @param platform - Raw platform name from database
 * @returns Normalized platform name
 */
function normalizePlatformName(platform: string): string {
  if (!platform) return 'Unknown Platform'
  
  const normalized = platform.toLowerCase().trim()
  
  // Common platform mappings
  const platformMappings: Record<string, string> = {
    'facebook ads': 'Facebook Ads',
    'facebook': 'Facebook Ads',
    'fb ads': 'Facebook Ads',
    'google ads': 'Google Ads',
    'google': 'Google Ads',
    'adwords': 'Google Ads',
    'tiktok ads': 'TikTok Ads',
    'tiktok': 'TikTok Ads',
    'linkedin ads': 'LinkedIn Ads',
    'linkedin': 'LinkedIn Ads',
    'instagram ads': 'Instagram Ads',
    'instagram': 'Instagram Ads',
    'twitter ads': 'Twitter Ads',
    'twitter': 'Twitter Ads',
    'youtube ads': 'YouTube Ads',
    'youtube': 'YouTube Ads'
  }

  return platformMappings[normalized] || platform
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Calculates the number of days between two dates
 * @param startDate - Start date string
 * @param endDate - End date string  
 * @returns Number of days
 */
function calculateDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * GET /api/dashboard/platform-spend
 * Fetches platform spend aggregated by platform from ad_spends table for dashboard metrics
 * 
 * Query Parameters:
 * - startDate: ISO string for filtering ad spends created after this date
 * - businessId: Business ID to filter ad spends
 * 
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - JSON response with enhanced platform spend data
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

    // TypeScript safety: startDate is guaranteed to be non-null after the check above
    const validStartDate: string = startDate

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

    // Fetch ad spends data aggregated by platform
    const { data: platformSpends, error } = await supabase
      .from('ad_spends')
      .select('platform, spend')
      .gte('created_at', validStartDate)
      .eq('business_id', requestedBusinessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching platform spends:', error)
      return NextResponse.json(
        { error: 'Failed to fetch platform spend data' },
        { status: 500 }
      )
    }

    if (!platformSpends || platformSpends.length === 0) {
      // Return empty data structure when no spends found
      const currentDate = new Date().toISOString().split('T')[0] as string
      const days = calculateDaysDifference(validStartDate, currentDate)
      
      const emptyMetrics: EnhancedDashboardMetrics = {
        platformSpend: 0, // Legacy field
        totalSpend: 0,
        platformSpends: [],
        timeRange: {
          startDate: validStartDate,
          endDate: currentDate,
          days: days
        }
      }

      return NextResponse.json({
        data: emptyMetrics,
        success: true
      })
    }

    // Aggregate spend by platform
    const platformAggregation = new Map<string, number>()
    let totalSpend = 0

    platformSpends.forEach((spend) => {
      const platform = normalizePlatformName(spend.platform || 'Unknown Platform')
      const amount = parseFloat(spend.spend || '0')
      
      platformAggregation.set(platform, (platformAggregation.get(platform) || 0) + amount)
      totalSpend += amount
    })

    // Convert to array and sort by spend amount (descending)
    const platformSpendsArray: PlatformSpend[] = Array.from(platformAggregation.entries())
      .map(([platform, spend]) => ({
        platform,
        spend: Math.round(spend * 100) / 100 // Round to 2 decimal places
      }))
      .sort((a, b) => b.spend - a.spend)

    // Calculate time range information
    const currentDate = new Date().toISOString().split('T')[0] as string
    const days = calculateDaysDifference(validStartDate, currentDate)
    
    const metrics: EnhancedDashboardMetrics = {
      platformSpend: Math.round(totalSpend * 100) / 100, // Legacy field for backward compatibility
      totalSpend: Math.round(totalSpend * 100) / 100,
      platformSpends: platformSpendsArray,
      timeRange: {
        startDate: validStartDate,
        endDate: currentDate,
        days: days
      }
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