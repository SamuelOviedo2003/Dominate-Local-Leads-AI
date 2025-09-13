import { NextRequest } from 'next/server'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'

/**
 * Authenticate request using cookie-based authentication
 * Compatible with the new cookie-based auth system
 */
export async function authenticateRequest(request: NextRequest) {
  const user = await getAuthenticatedUserFromRequest()

  if (!user) {
    throw new Error('Authentication failed - user not found')
  }

  return { user }
}