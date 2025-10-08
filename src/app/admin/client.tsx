'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AuthUser } from '@/types/auth'
import { ArrowLeft, Users } from 'lucide-react'
import ProfileManagementClientNew from '@/app/(dashboard)/profile-management/client-new'

interface AdminClientProps {
  user: AuthUser
}

/**
 * Admin page client component with unique layout
 * No global header - behaves like a completely new page
 * Only shows Profile Management section
 */
export default function AdminClient({ user }: AdminClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get the "from" parameter to know which business to return to
  const fromParam = searchParams.get('from') // e.g., "11/hard-roof"

  const handleReturnToDashboard = () => {
    // If we have a "from" parameter, use it to return to the same business
    if (fromParam) {
      router.push(`/${fromParam}/dashboard`)
      return
    }

    // Otherwise, use the first accessible business
    const firstBusiness = user.accessibleBusinesses?.[0]

    if (firstBusiness?.business_id && firstBusiness?.permalink) {
      router.push(`/${firstBusiness.business_id}/${firstBusiness.permalink}/dashboard`)
    } else {
      // Fallback to old dashboard if no business found
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with return button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 h-16 flex items-center">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="py-8">
        <div className="flex gap-4">
          {/* Left Vertical Menu - Only Profile Management */}
          <div className="w-48 flex-shrink-0 ml-4">
            <nav className="bg-white rounded-lg shadow p-3">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                Admin Panel
              </h2>
              <ul className="space-y-2">
                <li>
                  <button
                    className="w-full flex items-center space-x-2 px-2 py-2 rounded-md text-sm font-medium bg-purple-100 text-purple-700"
                  >
                    <Users className="w-4 h-4" />
                    <span>Team</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Right Content Area - Profile Management */}
          <div className="flex-1 mr-4">
            <ProfileManagementClientNew />
          </div>
        </div>
      </div>
    </div>
  )
}
