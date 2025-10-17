/**
 * Department check webhook utility
 * Sends user's dialpad_id and business department number to n8n webhook
 */

const WEBHOOK_URL = 'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/check-department'

interface DepartmentCheckPayload {
  dialpad_id: string | null
  department_number: string | null
}

/**
 * Sends department check webhook
 * Executes the request but doesn't wait for or require a response
 *
 * @param dialpadId - User's dialpad ID from profiles table
 * @param departmentNumber - Business phone number (from_number) from business_clients.dialpad_phone
 */
export async function sendDepartmentCheckWebhook(
  dialpadId: string | null | undefined,
  departmentNumber: string | null | undefined
): Promise<void> {
  try {
    // Trim whitespace from inputs
    const cleanDialpadId = dialpadId?.trim()
    const cleanDepartmentNumber = departmentNumber?.trim()

    // Don't send if either value is missing
    if (!cleanDialpadId || !cleanDepartmentNumber) {
      console.log('[DEPARTMENT_WEBHOOK] Skipping - missing data', {
        dialpad_id: cleanDialpadId || 'missing',
        department_number: cleanDepartmentNumber || 'missing'
      })
      return
    }

    const payload: DepartmentCheckPayload = {
      dialpad_id: cleanDialpadId,
      department_number: cleanDepartmentNumber
    }

    console.log('[DEPARTMENT_WEBHOOK] Sending webhook to:', WEBHOOK_URL)
    console.log('[DEPARTMENT_WEBHOOK] Payload:', JSON.stringify(payload))

    // Send the webhook (await to ensure it actually executes in server context)
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    console.log('[DEPARTMENT_WEBHOOK] ✓ Success - Status:', response.status, 'Body:', responseText)

  } catch (error) {
    console.error('[DEPARTMENT_WEBHOOK] ✗ Failed:', error)
  }
}
