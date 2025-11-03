import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { getSupabaseClient } from '@/lib/supabase/server-optimized'
import { logger } from '@/lib/logging'
import { DateTime } from 'luxon'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    logger.debug('Calendar free slots API call started')

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')
    const leadIdParam = searchParams.get('leadId')

    if (!businessIdParam) {
      return NextResponse.json(
        { error: 'businessId parameter is required' },
        { status: 400 }
      )
    }

    if (!leadIdParam) {
      return NextResponse.json(
        { error: 'leadId parameter is required' },
        { status: 400 }
      )
    }

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { businessId } = authResult
    const supabase = getSupabaseClient()

    // Fetch business_clients data
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('calendar_id, api_key, location_id, time_zone')
      .eq('business_id', businessId)
      .single()

    if (businessError || !businessData) {
      logger.error('Failed to fetch business client data', {
        error: businessError,
        businessId
      })
      return NextResponse.json(
        { error: 'Failed to fetch business client data' },
        { status: 500 }
      )
    }

    const { calendar_id, api_key, location_id, time_zone } = businessData

    if (!calendar_id || !api_key || !location_id) {
      logger.error('Missing required business client data', {
        businessId,
        hasCalendarId: !!calendar_id,
        hasApiKey: !!api_key,
        hasLocationId: !!location_id
      })
      return NextResponse.json(
        { error: 'Business client missing required configuration' },
        { status: 400 }
      )
    }

    // Calculate startDate and endDate in business timezone
    const businessTimezone = time_zone || 'America/New_York'
    const now = DateTime.now().setZone(businessTimezone)
    const startDate = now.startOf('day').toMillis()
    const endDate = now.plus({ days: 14 }).endOf('day').toMillis()

    logger.debug('Fetching calendar slots from GHL', {
      businessId,
      calendarId: calendar_id,
      locationId: location_id,
      timezone: businessTimezone,
      startDate,
      endDate
    })

    // Call GHL API to get free slots
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendar_id}/free-slots?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    )

    if (!ghlResponse.ok) {
      const errorText = await ghlResponse.text()
      logger.error('GHL API request failed', {
        status: ghlResponse.status,
        statusText: ghlResponse.statusText,
        error: errorText,
        businessId,
        calendarId: calendar_id
      })
      return NextResponse.json(
        { error: 'Failed to fetch calendar slots from GHL', details: errorText },
        { status: ghlResponse.status }
      )
    }

    const ghlData = await ghlResponse.json()

    logger.debug('Calendar slots fetched successfully', {
      businessId,
      calendarId: calendar_id,
      slotsCount: ghlData?.slots ? Object.keys(ghlData.slots).length : 0,
      rawResponse: JSON.stringify(ghlData).substring(0, 500)
    })

    return NextResponse.json({
      success: true,
      slots: ghlData.slots || ghlData || {},
      timezone: businessTimezone,
      rawGhlResponse: ghlData
    })

  } catch (error) {
    logger.error('Unexpected error in calendar free slots API', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
