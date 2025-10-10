import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/businesses
 * List all available businesses
 * Only accessible to super admins (role = 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can access business management
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can access business management' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)

    // Fetch all businesses with all fields
    const { data: businesses, error } = await supabase
      .from('business_clients')
      .select('*')
      .order('company_name')

    if (error) {
      console.error('Error fetching businesses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: businesses,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/businesses
 * Create a new business
 * Only accessible to super admins (role = 0)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can create businesses
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can create businesses' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Build insert object with all fields, converting empty strings to null
    const insertObject: Record<string, any> = { dashboard: true }
    Object.keys(body).forEach(key => {
      const value = body[key]
      insertObject[key] = value === '' ? null : value
    })

    // Insert new business
    const { data: newBusiness, error } = await supabase
      .from('business_clients')
      .insert(insertObject)
      .select()
      .single()

    if (error) {
      console.error('Error creating business:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: newBusiness,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/businesses
 * Update an existing business
 * Only accessible to super admins (role = 0)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can update businesses
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can update businesses' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)

    // Parse request body
    const body = await request.json()
    const { businessId, ...updateData } = body

    // Validate required fields
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    if (!updateData.company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Build update object with all fields, converting empty strings to null
    const updateObject: Record<string, any> = {}
    Object.keys(updateData).forEach(key => {
      const value = updateData[key]
      updateObject[key] = value === '' ? null : value
    })
    updateObject.modified_at = new Date().toISOString()

    // Update business
    const { data: updatedBusiness, error } = await supabase
      .from('business_clients')
      .update(updateObject)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating business:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedBusiness,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/businesses
 * Delete a business
 * Only accessible to super admins (role = 0)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and authorization using JWT tokens
    const { user } = await authenticateRequest(request)

    // Only super admins can delete businesses
    if (user.profile?.role !== 0) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins can delete businesses' },
        { status: 403 }
      )
    }

    // Create Supabase client with user's JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(token)

    // Get businessId from query params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Validate required fields
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Delete business
    const { error } = await supabase
      .from('business_clients')
      .delete()
      .eq('business_id', parseInt(businessId))

    if (error) {
      console.error('Error deleting business:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete business' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}