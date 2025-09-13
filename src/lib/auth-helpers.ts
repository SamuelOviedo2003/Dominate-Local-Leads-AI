// Temporary compatibility file for the new authentication system
// This file provides compatibility shims for components that haven't been updated yet

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser as getAuthenticatedUserWithToken } from '@/lib/auth-helpers-simple'

// Export the new functions with old names for compatibility
export { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
export { getHeaderData } from '@/lib/auth-helpers-simple'
export { validateBusinessAccess as validateBusinessAccessWithToken } from '@/lib/auth-helpers-simple'
export { updateUserBusinessContext as updateUserBusinessContextWithToken } from '@/lib/auth-helpers-simple'

// Compatibility function for server client creation
export async function createClientForRequest(request?: Request) {
  if (!request) {
    throw new Error('Request object required for new authentication system')
  }
  
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('No authorization token found')
  }
  
  return createClient(token)
}

// Mock function for old getAvailableBusinessesWithToken
export async function getAvailableBusinessesWithToken(userId: string, token?: string) {
  if (!token) {
    throw new Error('Token required')
  }
  
  const user = await getAuthenticatedUserWithToken(token)
  return user.accessibleBusinesses
}

// Mock function for old auth pattern - temporary fallback to prevent server component crashes
export async function getAuthenticatedUser(): Promise<any> {
  // For server components that can't access localStorage, return null to trigger redirect to login
  // This prevents server component crashes while maintaining security
  console.warn('getAuthenticatedUser() without token is deprecated. Server component will redirect to login.')
  return null
}

// Mock function for API-based authentication checks (used by root page)
export async function getAuthenticatedUserForAPI(): Promise<any> {
  // For the root page, we can't easily validate authentication without a request object
  // Return null to redirect to login, where proper authentication will be handled
  return null
}