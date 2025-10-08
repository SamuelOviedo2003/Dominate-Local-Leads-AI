import AdminClient from './client'
import { getAuthenticatedUserFromRequest } from '@/lib/auth-helpers-simple'
import { redirect } from 'next/navigation'

// Force dynamic rendering due to authentication requirements
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin - Dominate Local Leads',
  description: 'Manage user profiles and permissions'
}

/**
 * Admin page - unique layout without global header
 * Server component that fetches initial auth data
 * Only accessible to Super Admins (role 0)
 */
export default async function AdminPage() {
  // Ensure user is authenticated and get initial data with proper auth
  const user = await getAuthenticatedUserFromRequest()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Redirect to dashboard if not super admin
  if (user.profile?.role !== 0) {
    const firstBusiness = user.accessibleBusinesses?.[0]
    if (firstBusiness?.business_id && firstBusiness?.permalink) {
      redirect(`/${firstBusiness.business_id}/${firstBusiness.permalink}/dashboard`)
    } else {
      redirect('/dashboard')
    }
  }

  return <AdminClient user={user} />
}
