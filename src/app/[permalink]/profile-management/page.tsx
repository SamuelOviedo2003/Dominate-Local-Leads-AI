import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import ProfileManagementClient from '@/app/(dashboard)/profile-management/client'

export const dynamic = 'force-dynamic'

interface PermalinkProfileManagementPageProps {
  params: { permalink: string }
}

/**
 * Permalink-based profile management page that handles /{permalink}/profile-management routes
 * This leverages the business context established by the permalink layout
 * and reuses the existing ProfileManagementClient component
 */
export default async function PermalinkProfileManagementPage({ 
  params 
}: PermalinkProfileManagementPageProps) {
  // Check authentication and authorization
  const user = await getAuthenticatedUser()
  
  // Only super admins (role 0) can access profile management
  if (user.profile?.role !== 0) {
    // Redirect to the current business dashboard instead of base dashboard
    redirect(`/${params.permalink}/dashboard`)
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
        <p className="mt-2 text-gray-600">
          Manage user access to businesses and assign permissions.
        </p>
      </div>
      
      <ProfileManagementClient />
    </div>
  )
}