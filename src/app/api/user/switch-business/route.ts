import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createCookieClient } from '@/lib/supabase/server'
import { sendDepartmentCheckWebhook } from '@/lib/utils/departmentWebhook'

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request)
    const { businessId } = await request.json()

    // Validate business ID
    const businessIdInt = parseInt(businessId, 10)
    if (isNaN(businessIdInt)) {
      return Response.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      )
    }

    // Check if user has access to this business
    const hasAccess = user.accessibleBusinesses?.some(
      business => business.business_id === businessId
    )
    if (!hasAccess) {
      return Response.json(
        { success: false, error: 'Access denied to this business' },
        { status: 403 }
      )
    }

    // Update user's business context using cookie client
    const supabase = createCookieClient()
    const { error } = await supabase
      .from('profiles')
      .update({ business_id: businessIdInt })
      .eq('id', user.id)

    if (error) {
      throw new Error('Failed to update business context')
    }

    // Send department check webhook after successful switch
    // Fetch user's dialpad_id and the business dialpad_phone
    const { data: profileData } = await supabase
      .from('profiles')
      .select('dialpad_id')
      .eq('id', user.id)
      .single()

    const { data: businessData } = await supabase
      .from('business_clients')
      .select('dialpad_phone')
      .eq('business_id', businessIdInt)
      .single()

    console.log('[SWITCH-BUSINESS] Webhook check:', {
      has_dialpad_id: !!profileData?.dialpad_id,
      dialpad_id: profileData?.dialpad_id,
      has_dialpad_phone: !!businessData?.dialpad_phone,
      dialpad_phone: businessData?.dialpad_phone
    })

    // Always call webhook function - it handles validation internally
    await sendDepartmentCheckWebhook(profileData?.dialpad_id, businessData?.dialpad_phone)

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Business switch failed' },
      { status: 400 }
    )
  }
}