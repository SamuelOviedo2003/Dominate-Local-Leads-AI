'use client'

import { useState, useMemo, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Flame, MessageSquare, Menu } from 'lucide-react'
import { AuthUser } from '@/types/auth'
import { useSmsCount } from '@/hooks/useSmsCount'
import { useWaitingToCallCount } from '@/hooks/useWaitingToCallCount'
import {
  extractBusinessFromPath,
  isBusinessPath,
  getBusinessUrl
} from '@/lib/permalink-utils'
import MobileSidebar from './MobileSidebar'

interface TopBarProps {
  user: AuthUser | null
  logoutAction: () => void
  isSuperAdmin: boolean
  hasMultipleBusinesses: boolean
}

export default function TopBar({ user, logoutAction, isSuperAdmin, hasMultipleBusinesses }: TopBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { count: smsCount } = useSmsCount()
  const { count: waitingToCallCount } = useWaitingToCallCount()

  // Memoize business detection
  const isUsingBusiness = useMemo(() => isBusinessPath(pathname), [pathname])
  const { businessId, permalink: currentPermalink } = useMemo(
    () => extractBusinessFromPath(pathname),
    [pathname]
  )

  // Navigation handler
  const handleNavigation = useCallback(
    (href: string, event?: React.MouseEvent) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      router.push(href)
    },
    [router]
  )

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center lg:left-64">
        {/* Mobile Menu Toggle - Only visible on mobile */}
        <button
          type="button"
          className="lg:hidden p-2 ml-4 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>

        {/* Spacer to push content to the right */}
        <div className="flex-1" />

        {/* Right Section: Notification Icons + User Dropdown */}
        <div className="flex items-center space-x-3 pr-6">
          {/* Speed to Lead Icon */}
          {isUsingBusiness && businessId && currentPermalink && (
            <button
              type="button"
              onClick={(e) =>
                handleNavigation(
                  getBusinessUrl('waiting-to-call', businessId, currentPermalink),
                  e
                )
              }
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
              aria-label="Speed to Lead"
              title="Speed to Lead"
            >
              <Flame className="h-5 w-5 text-gray-600 group-hover:text-orange-600" />

              {/* Badge */}
              {waitingToCallCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                  {waitingToCallCount > 99 ? '99+' : waitingToCallCount}
                </span>
              )}
            </button>
          )}

          {/* Messages Icon */}
          {isUsingBusiness && businessId && currentPermalink && (
            <button
              type="button"
              onClick={(e) =>
                handleNavigation(
                  getBusinessUrl('waiting-to-call', businessId, currentPermalink),
                  e
                )
              }
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
              aria-label="Messages"
              title="Messages"
            >
              <MessageSquare className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />

              {/* Badge */}
              {smsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                  {smsCount > 99 ? '99+' : smsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <MobileSidebar
          isSuperAdmin={isSuperAdmin}
          hasMultipleBusinesses={hasMultipleBusinesses}
          user={user}
          logoutAction={logoutAction}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
