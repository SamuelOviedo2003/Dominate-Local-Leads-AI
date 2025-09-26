import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndAuthorizeApiRequest } from '@/lib/api-auth-optimized'
import { logger } from '@/lib/logging'

export const dynamic = 'force-dynamic'

interface VerifyAddressPayload {
  lead_id: string
  account_id: string
  business_id: string
  street_name: string
  postal_code: string
}

export async function POST(request: NextRequest) {
  try {
    logger.debug('Address verification API call started')

    // Extract query parameters for authentication
    const { searchParams } = new URL(request.url)
    const businessIdParam = searchParams.get('businessId')

    // Use optimized authentication and authorization
    const authResult = await authenticateAndAuthorizeApiRequest(request, businessIdParam)
    if (authResult instanceof Response) {
      return authResult
    }

    const { user, businessId } = authResult

    // Parse request body
    const body: VerifyAddressPayload = await request.json()
    const { lead_id, account_id, business_id, street_name, postal_code } = body

    // Validate required fields
    if (!lead_id || !account_id || !business_id || !street_name || !postal_code) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, account_id, business_id, street_name, postal_code' },
        { status: 400 }
      )
    }

    // Validate field formats
    if (typeof street_name !== 'string' || street_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'street_name must be a non-empty string' },
        { status: 400 }
      )
    }

    if (typeof postal_code !== 'string' || postal_code.trim().length === 0) {
      return NextResponse.json(
        { error: 'postal_code must be a non-empty string' },
        { status: 400 }
      )
    }

    // Prepare webhook payload
    const webhookPayload = {
      lead_id,
      account_id,
      business_id,
      street_name: street_name.trim(),
      postal_code: postal_code.trim()
    }

    logger.debug('Sending address verification to webhook', {
      leadId: lead_id,
      accountId: account_id,
      businessId,
      userId: user.id
    })

    // Send to external webhook
    const webhookUrl = 'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-verify-address'

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      logger.error('Webhook request failed', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: errorText,
        leadId: lead_id,
        accountId: account_id
      })

      return NextResponse.json(
        {
          error: 'Failed to submit address verification request',
          details: `Webhook responded with status ${webhookResponse.status}`
        },
        { status: 500 }
      )
    }

    const webhookResult = await webhookResponse.json()

    logger.debug('Address verification webhook success', {
      leadId: lead_id,
      accountId: account_id,
      businessId,
      userId: user.id,
      webhookResponse: webhookResult
    })

    return NextResponse.json({
      success: true,
      message: 'Address verification request submitted successfully',
      data: {
        lead_id,
        account_id,
        business_id,
        street_name: street_name.trim(),
        postal_code: postal_code.trim(),
        submitted_at: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Unexpected error in address verification API', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}