'use client'

import { useState } from 'react'
import { AuthUser } from '@/types/auth'
import { Users, Building2 } from 'lucide-react'
import ProfileManagementClientNew from '@/app/(dashboard)/profile-management/client-new'
import BusinessManagement from './business-management'

interface AdminClientProps {
  user: AuthUser
}

type AdminSection = 'team' | 'business'

/**
 * Admin page client component with unique layout
 * No global header - behaves like a completely new page
 * Shows Team and Business sections with horizontal navigation
 */
export default function AdminClient({ user: _user }: AdminClientProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('team')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with horizontal navigation menu */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Admin Panel</h1>

          {/* Horizontal Navigation Menu */}
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveSection('team')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'team'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Team</span>
            </button>
            <button
              onClick={() => setActiveSection('business')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'business'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Business</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="py-6 px-6">
        {activeSection === 'team' && <ProfileManagementClientNew />}
        {activeSection === 'business' && <BusinessManagement />}
      </div>
    </div>
  )
}
