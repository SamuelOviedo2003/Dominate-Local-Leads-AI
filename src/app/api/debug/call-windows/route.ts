import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

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
    const accountId = searchParams.get('accountId')
    const businessId = searchParams.get('businessId')

    const supabase = await createClient()
    const debugResults: any = {}

    // Test 1: Count all call_windows
    const { count: totalCount, error: countError } = await supabase
      .from('call_windows')
      .select('*', { count: 'exact', head: true })

    debugResults.totalCallWindows = {
      count: totalCount,
      error: countError
    }

    // Test 2: Get first 10 call_windows with all fields
    const { data: sampleWindows, error: sampleError } = await supabase
      .from('call_windows')
      .select('*')
      .limit(10)

    debugResults.sampleWindows = {
      data: sampleWindows,
      count: sampleWindows?.length || 0,
      error: sampleError
    }

    // Test 3: Get unique account_ids from call_windows
    const { data: accountIds, error: accountIdsError } = await supabase
      .from('call_windows')
      .select('account_id')
      .limit(100)

    const uniqueAccountIds = [...new Set(accountIds?.map(cw => cw.account_id) || [])]
    debugResults.uniqueAccountIds = {
      data: uniqueAccountIds,
      count: uniqueAccountIds.length,
      error: accountIdsError
    }

    // Test 4: If accountId provided, check for that specific account
    if (accountId) {
      const { data: accountWindows, error: accountError } = await supabase
        .from('call_windows')
        .select('*')
        .eq('account_id', accountId)

      debugResults.specificAccount = {
        accountId,
        data: accountWindows,
        count: accountWindows?.length || 0,
        error: accountError
      }
    }

    // Test 5: If businessId provided, check for that specific business
    if (businessId) {
      const { data: businessWindows, error: businessError } = await supabase
        .from('call_windows')
        .select('*')
        .eq('business_id', businessId)
        .limit(10)

      debugResults.specificBusiness = {
        businessId,
        data: businessWindows,
        count: businessWindows?.length || 0,
        error: businessError
      }
    }

    // Test 6: Check RLS policy by trying different users
    debugResults.currentUser = {
      userId: user.id,
      businessId: user.profile.business_id,
      role: user.profile.role
    }

    return NextResponse.json({
      success: true,
      data: debugResults
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}