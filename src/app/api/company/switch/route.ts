import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'
import { BusinessSwitcherData } from '@/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for cookie-based auth
    const supabase = createCookieClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const effectiveRole = profile.role ?? 1

    // Validate access to the requested business
    let hasAccess = false
    
    if (effectiveRole === 0) {
      // Super admin - check business exists and has dashboard=true
      const { data: business } = await supabase
        .from('business_clients')
        .select('business_id')
        .eq('business_id', companyId)
        .eq('dashboard', true)
        .single()
      
      hasAccess = !!business
    } else {
      // Regular user - check profile_businesses access
      const { data: access } = await supabase
        .from('profile_businesses')
        .select('business_id')
        .eq('profile_id', user.id)
        .eq('business_id', parseInt(companyId, 10))
        .single()
      
      hasAccess = !!access
    }
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to the requested business' },
        { status: 403 }
      )
    }

    // Get the requested company details
    const { data: selectedCompany } = await supabase
      .from('business_clients')
      .select('business_id, company_name, permalink, avatar_url, city, state')
      .eq('business_id', companyId)
      .single()

    if (!selectedCompany) {
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
          business_id: selectedCompany.business_id,
          company_name: selectedCompany.company_name,
          permalink: selectedCompany.permalink,
          avatar_url: selectedCompany.avatar_url,
          city: selectedCompany.city,
          state: selectedCompany.state
        },
        message: `Successfully switched to ${selectedCompany.company_name}`
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
    // Create Supabase client for cookie-based auth
    const supabase = createCookieClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const effectiveRole = profile.role ?? 1
    let businesses: BusinessSwitcherData[] = []

    if (effectiveRole === 0) {
      // Super admin - all businesses with dashboard=true
      const { data: businessData, error } = await supabase
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state, permalink')
        .eq('dashboard', true)
        .order('company_name')

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch businesses' },
          { status: 500 }
        )
      }

      businesses = (businessData || []).map(b => ({
        business_id: b.business_id.toString(),
        company_name: b.company_name,
        permalink: b.permalink,
        avatar_url: b.avatar_url,
        city: b.city,
        state: b.state
      }))
    } else {
      // Regular user - businesses from profile_businesses
      const { data: userBusinesses, error } = await supabase
        .from('profile_businesses')
        .select(`
          business_id,
          business_clients!inner(
            business_id,
            company_name,
            avatar_url,
            city,
            state,
            permalink
          )
        `)
        .eq('profile_id', user.id)
      
      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch user businesses' },
          { status: 500 }
        )
      }

      businesses = (userBusinesses || []).map((ub: any) => ({
        business_id: ub.business_clients.business_id.toString(),
        company_name: ub.business_clients.company_name,
        avatar_url: ub.business_clients.avatar_url,
        city: ub.business_clients.city,
        state: ub.business_clients.state,
        permalink: ub.business_clients.permalink
      }))
    }

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