'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { AuthUser } from '@/types/auth'
import { useSecureLogout } from '@/hooks/useSecureLogout'
import { useClickOutside } from '@/hooks/useClickOutside'
import { extractBusinessFromPath } from '@/lib/permalink-utils'

interface UserDropdownProps {
  user: AuthUser | null | undefined
  logoutAction?: () => void // Made optional since we'll use secure logout
}

export default function UserDropdown({ user, logoutAction }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { logout: secureLogout } = useSecureLogout()
  const pathname = usePathname()

  // Use shared click-outside hook
  useClickOutside(dropdownRef, useCallback(() => setIsOpen(false), []))

  // Extract current business context from URL to preserve it when navigating to settings
  const settingsUrl = useMemo(() => {
    const { businessId, permalink } = extractBusinessFromPath(pathname)

    if (businessId && permalink) {
      return `/settings?from=${businessId}/${permalink}`
    }

    return '/settings'
  }, [pathname])

  // Admin URL for super admins only
  const adminUrl = useMemo(() => {
    const { businessId, permalink } = extractBusinessFromPath(pathname)

    if (businessId && permalink) {
      return `/admin?from=${businessId}/${permalink}`
    }

    return '/admin'
  }, [pathname])

  // Don't render if user is not available
  if (!user) {
    return (
      <div className="text-sm text-white/60">
        Loading...
      </div>
    )
  }

  // Get user initials for avatar
  const getInitials = (email: string | undefined | null) => {
    if (!email || email.length === 0) return '?'
    return email.charAt(0).toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger - Circle with First Letter Only */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 cursor-pointer border-0 p-0"
        style={{ aspectRatio: '1/1' }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
      >
        {getInitials(user?.email)}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {getInitials(user?.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.profile?.full_name || user?.email || 'Unknown User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'Unknown User'}
                </p>
                {user?.profile?.role === 0 && (
                  <p className="text-xs text-blue-600 font-medium">
                    Super Admin
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-1">
            {/* Admin - Super Admin Only */}
            {user?.profile?.role === 0 && (
              <Link
                href={adminUrl}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            {/* Edit Profile Link */}
            <Link
              href={settingsUrl}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              <span>Edit Profile</span>
            </Link>

            {/* Logout Option */}
            <button
              onClick={() => {
                setIsOpen(false)
                // Use secure logout or fallback to provided action
                if (logoutAction) {
                  logoutAction()
                } else {
                  secureLogout()
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}