import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { actionId: string } }) {
  try {
    const { user } = await authenticateRequest(request)

    const actionId = parseInt(params.actionId, 10)
    if (isNaN(actionId)) {
      return Response.json(
        { error: 'actionId must be a valid number' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action_done, action_response } = body

    if (typeof action_done !== 'boolean') {
      return Response.json(
        { error: 'action_done must be a boolean value' },
        { status: 400 }
      )
    }

    const supabase = createCookieClient()

    // First, verify the action exists and the user has access to it
    const { data: actionData, error: fetchError } = await supabase
      .from('ai_recap_actions')
      .select('business_id, lead_id')
      .eq('ai_recap_action_id', actionId)
      .single()

    if (fetchError || !actionData) {
      return Response.json(
        { error: 'Action not found' },
        { status: 404 }
      )
    }

    // Validate business access permissions using user's accessible businesses
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === actionData.business_id.toString()
    )
    if (!hasAccess) {
      return Response.json(
        { error: 'Access denied - You do not have access to this business data' },
        { status: 403 }
      )
    }

    // Update the action
    const updateData: any = {
      action_done,
      updated_at: new Date().toISOString()
    }

    // Only update action_response if it's provided
    if (action_response !== undefined) {
      updateData.action_response = action_response
    }

    const { data: updatedAction, error: updateError } = await supabase
      .from('ai_recap_actions')
      .update(updateData)
      .eq('ai_recap_action_id', actionId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      return Response.json(
        { error: 'Failed to update action' },
        { status: 500 }
      )
    }

    return Response.json({
      data: updatedAction,
      success: true
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}