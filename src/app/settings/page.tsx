import SettingsClient from './client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { redirect } from 'next/navigation'

// Force dynamic rendering due to authentication requirements
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Settings - Dominate Local Leads',
  description: 'Manage your account settings and profile information'
}

/**
 * Settings page - unique layout without global header
 * Server component that fetches initial auth data
 */
export default async function SettingsPage() {
  // Ensure user is authenticated and get initial data with proper auth
  const user = await getAuthenticatedUserFromRequest()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  return <SettingsClient user={user} />
}