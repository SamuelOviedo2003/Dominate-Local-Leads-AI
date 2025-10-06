import { NextRequest, NextResponse } from 'next/server'
import { getRequestAuthUser, getSupabaseClient } from '@/lib/supabase/server-optimized'
import { BusinessSwitcherData } from '@/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Use optimized auth to get cached user data
    const user = await getRequestAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const effectiveRole = user.profile?.role ?? 1
    const supabase = getSupabaseClient()

    // OPTIMIZATION: Parallel queries for access check and company details
    const [accessCheck, selectedCompany] = await Promise.all([
      effectiveRole === 0
        ? supabase
            .from('business_clients')
            .select('business_id')
            .eq('business_id', companyId)
            .eq('dashboard', true)
            .single()
        : supabase
            .from('profile_businesses')
            .select('business_id')
            .eq('profile_id', user.id)
            .eq('business_id', parseInt(companyId, 10))
            .single(),
      supabase
        .from('business_clients')
        .select('business_id, company_name, permalink, avatar_url, city, state')
        .eq('business_id', companyId)
        .single()
    ])

    const hasAccess = !!accessCheck.data

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to the requested business' },
        { status: 403 }
      )
    }

    if (!selectedCompany.data) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Update user's current business context
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ business_id: parseInt(companyId) })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update business context' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        company: {
          business_id: selectedCompany.data.business_id,
          company_name: selectedCompany.data.company_name,
          permalink: selectedCompany.data.permalink,
          avatar_url: selectedCompany.data.avatar_url,
          city: selectedCompany.data.city,
          state: selectedCompany.data.state
        },
        message: `Successfully switched to ${selectedCompany.data.company_name}`
      }
    })

  } catch (error) {
    console.error('Error switching company:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Use optimized auth to get cached user data - businesses already loaded!
    const user = await getRequestAuthUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // OPTIMIZATION: Return already-loaded businesses from cached auth user
    const businesses = user.accessibleBusinesses || []

    if (businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No businesses associated with your account' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: businesses
    })

  } catch (error) {
    console.error('Error fetching available companies:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}