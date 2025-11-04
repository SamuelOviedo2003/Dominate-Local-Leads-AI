'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  Phone,
  BarChart3,
  Flame,
  MessageSquare,
  X,
  User,
  Shield
} from 'lucide-react'
import { NavigationItem, AuthUser } from '@/types/auth'
import {
  extractBusinessFromPath,
  isBusinessPath,
  extractCurrentSection,
  generateBusinessNavigation,
  getBusinessUrl
} from '@/lib/permalink-utils'
import { useSmsCount } from '@/hooks/useSmsCount'
import { useWaitingToCallCount } from '@/hooks/useWaitingToCallCount'
import { useCurrentBusiness } from '@/contexts/BusinessContext'

interface MobileSidebarProps {
  isSuperAdmin: boolean
  hasMultipleBusinesses: boolean
  user: AuthUser | null
  logoutAction: () => void
  onClose: () => void
}

// Map section names to icons
const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'new-leads': UserPlus,
  'bookings': Calendar,
  'incoming-calls': Phone,
  'fb-analysis': BarChart3,
  'waiting-to-call': Flame,
  'messages': MessageSquare
}

export default function MobileSidebar({ isSuperAdmin, hasMultipleBusinesses, user, logoutAction, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { count: smsCount } = useSmsCount()
  const { count: waitingToCallCount } = useWaitingToCallCount()
  const currentBusiness = useCurrentBusiness()

  // Memoize business detection
  const isUsingBusiness = useMemo(() => isBusinessPath(pathname), [pathname])
  const { businessId, permalink: currentPermalink } = useMemo(
    () => extractBusinessFromPath(pathname),
    [pathname]
  )
  const currentSection = useMemo(() => extractCurrentSection(pathname), [pathname])

  // Generate navigation items
  const navigationItems = useMemo(() => {
    // For business paths, use the current business from URL
    if (isUsingBusiness && businessId && currentPermalink) {
      return generateBusinessNavigation(businessId, currentPermalink, isSuperAdmin)
    }
    // For non-business paths (admin, settings), use the current business from context
    if (currentBusiness?.business_id && currentBusiness?.permalink) {
      return generateBusinessNavigation(
        currentBusiness.business_id.toString(),
        currentBusiness.permalink,
        isSuperAdmin
      )
    }
    return []
  }, [isUsingBusiness, businessId, currentPermalink, isSuperAdmin, currentBusiness])

  // Use navigation items as-is (Speed to Lead and Messages removed from sidebar)
  const extendedNavigation = useMemo(() => {
    return navigationItems
  }, [navigationItems])

  // Navigation handler
  const handleNavigation = useCallback(
    (href: string, event?: React.MouseEvent) => {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      router.push(href)
      onClose()
    },
    [router, onClose]
  )

  // Check if link is active
  const isActiveLink = useCallback(
    (href: string) => {
      if (isUsingBusiness && currentPermalink) {
        const hrefParts = href.split('/')
        const hrefSection = hrefParts[hrefParts.length - 1] || 'dashboard'
        return currentSection === hrefSection
      }
      return pathname.startsWith(href)
    },
    [isUsingBusiness, currentPermalink, currentSection, pathname]
  )

  // Get badge count for specific sections
  const getBadgeCount = useCallback(
    (sectionName: string) => {
      if (sectionName === 'Speed to Lead') return waitingToCallCount
      if (sectionName === 'Messages') return smsCount
      return 0
    },
    [waitingToCallCount, smsCount]
  )

  // Get icon for section
  const getIcon = useCallback((item: NavigationItem) => {
    const sectionName = item.href.split('/').pop() || 'dashboard'
    const IconComponent = sectionIcons[sectionName] || LayoutDashboard
    return IconComponent
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-16 bottom-0 w-64 bg-gray-900 z-50 lg:hidden overflow-y-auto">
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <span className="text-white font-semibold">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {extendedNavigation.map((item) => {
            const Icon = getIcon(item)
            const isActive = isActiveLink(item.href)
            const badgeCount = getBadgeCount(item.name)

            return (
              <button
                key={item.name}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`relative w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
                type="button"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>

                {/* Badge for notifications */}
                {badgeCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            )
          })}

          {/* Separator before Admin section */}
          {isSuperAdmin && (
            <div className="pt-4">
              <div className="border-t border-gray-200 mb-4"></div>

              {/* Admin Section */}
              <button
                onClick={(e) => {
                  handleNavigation('/admin', e)
                  onClose()
                }}
                className={`relative w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                  pathname === '/admin'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
                type="button"
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">Admin</span>
              </button>
            </div>
          )}

          {/* User Info at Bottom */}
          <div className="pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={(e) => {
                handleNavigation('/settings', e)
                onClose()
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                pathname === '/settings'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              type="button"
            >
              <User className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">
                  {user?.profile?.full_name || user?.email || 'User'}
                </div>
                <div className="text-xs opacity-70 truncate">
                  {isSuperAdmin ? 'Super Admin' : 'User'}
                </div>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </>
  )
}
