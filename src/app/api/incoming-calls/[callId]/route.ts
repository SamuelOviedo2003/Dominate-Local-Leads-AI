import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'
import { IncomingCall } from '@/types/leads'
import { createSecureAPIHandler, addSecurityHeaders } from '@/lib/api-middleware'
import { updateCallerTypeSchema } from '@/lib/validation'
import { requireValidBusinessId } from '@/lib/type-utils'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

interface CallIdParams {
  params: {
    callId: string
  }
}

export async function GET(request: NextRequest, { params }: CallIdParams) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile?.business_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { callId } = params
    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the specific call details
    const { data: callData, error } = await supabase
      .from('incoming_calls')
      .select('incoming_call_id, source, caller_type, duration, assigned_id, assigned, created_at, business_id, recording_url, call_summary')
      .eq('incoming_call_id', callId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this business data
    const userBusinessId = parseInt(user.profile.business_id, 10)
    const callBusinessId = parseInt(callData.business_id, 10)
    
    if (user.profile.role !== 0 && callBusinessId !== userBusinessId) {
      return NextResponse.json(
        { error: 'Access denied - You can only access your own business data' },
        { status: 403 }
      )
    }

    // Format the call data according to IncomingCall interface
    const formattedCall: IncomingCall = {
      incoming_call_id: callData.incoming_call_id,
      source: callData.source,
      caller_type: callData.caller_type,
      duration: callData.duration || 0,
      assigned_id: callData.assigned_id || null,
      assigned_name: callData.assigned || null,
      created_at: callData.created_at,
      business_id: callData.business_id,
      recording_url: callData.recording_url || null,
      call_summary: callData.call_summary || null
    }

    return NextResponse.json({
      data: formattedCall,
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

export async function PATCH(request: NextRequest, { params }: CallIdParams) {
  try {
    // Check authentication
    const user = await getAuthenticatedUserForAPI()
    if (!user || !user.profile?.business_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    const { callId } = params
    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { caller_type } = body

    // Validate caller_type if provided
    const validCallerTypes = ['Client', 'Sales person', 'Other', 'Looking for job']
    if (caller_type !== null && caller_type !== undefined && !validCallerTypes.includes(caller_type)) {
      return NextResponse.json(
        { error: `Invalid caller_type. Must be one of: ${validCallerTypes.join(', ')}, or null` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First, verify the call exists and user has access
    const { data: existingCall, error: fetchError } = await supabase
      .from('incoming_calls')
      .select('business_id')
      .eq('incoming_call_id', callId)
      .single()

    if (fetchError) {
      console.error('Database error:', fetchError)
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this business data
    const userBusinessId = parseInt(user.profile.business_id, 10)
    const callBusinessId = parseInt(existingCall.business_id, 10)
    
    if (user.profile.role !== 0 && callBusinessId !== userBusinessId) {
      return NextResponse.json(
        { error: 'Access denied - You can only access your own business data' },
        { status: 403 }
      )
    }

    // Update the caller_type
    const { data: updatedCall, error: updateError } = await supabase
      .from('incoming_calls')
      .update({ caller_type: caller_type })
      .eq('incoming_call_id', callId)
      .select('incoming_call_id, caller_type')
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update caller type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updatedCall,
      success: true,
      message: 'Caller type updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}