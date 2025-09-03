import SettingsClient from './client'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

export const metadata = {
  title: 'Settings - Dominate Local Leads',
  description: 'Manage your account settings and profile information'
}

/**
 * Settings page - unique layout without global header
 * Server component that fetches initial auth data
 */
export default async function SettingsPage() {
  // Ensure user is authenticated and get initial data
  const user = await getAuthenticatedUser()
  
  return <SettingsClient user={user} />
}