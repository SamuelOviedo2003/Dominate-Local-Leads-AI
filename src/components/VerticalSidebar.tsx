'use client'

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  Phone,
  BarChart3,
  Flame,
  MessageSquare,
  ChevronDown,
  User,
  Settings,
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
import { useCurrentBusiness, useBusinessContext } from '@/contexts/BusinessContext'
import ImageWithFallback from './ImageWithFallback'

interface VerticalSidebarProps {
  isSuperAdmin: boolean
  hasMultipleBusinesses: boolean
  user: AuthUser | null
  logoutAction: () => void
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

export default function VerticalSidebar({ isSuperAdmin, hasMultipleBusinesses, user, logoutAction }: VerticalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { count: smsCount } = useSmsCount()
  const { count: waitingToCallCount } = useWaitingToCallCount()
  const currentBusiness = useCurrentBusiness()
  const { availableBusinesses, setSelectedCompany, isLoading } = useBusinessContext()
  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBusinessDropdownOpen(false)
      }
    }

    if (isBusinessDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isBusinessDropdownOpen])

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
    },
    [router]
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

  // Truncate company name to 20 characters
  const truncatedCompanyName = useMemo(() => {
    if (!currentBusiness?.company_name) return ''
    const name = currentBusiness.company_name
    return name.length > 20 ? `${name.substring(0, 20)}…` : name
  }, [currentBusiness?.company_name])

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Sidebar Header - Unified Company Dropdown (h-16 to match TopBar) */}
      <div className="h-16 px-4 border-b border-gray-200 bg-white flex items-center">
        <div ref={dropdownRef} className="relative w-full">
          {/* Unified Dropdown Button - Logo + Name + Arrow */}
          <button
            type="button"
            onClick={() => (isSuperAdmin || hasMultipleBusinesses) && setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
            disabled={!isSuperAdmin && !hasMultipleBusinesses}
            className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
              (isSuperAdmin || hasMultipleBusinesses)
                ? 'hover:bg-gray-50 cursor-pointer'
                : 'cursor-default'
            }`}
          >
            {/* Company Logo */}
            <div className="flex-shrink-0">
              {currentBusiness?.avatar_url ? (
                <ImageWithFallback
                  src={currentBusiness.avatar_url}
                  alt={currentBusiness.company_name}
                  className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                  fallbackBehavior="placeholder"
                  fallbackText={currentBusiness.company_name?.charAt(0) || 'B'}
                  extractColors={false}
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border border-gray-200">
                  {currentBusiness?.company_name?.charAt(0) || 'B'}
                </div>
              )}
            </div>

            {/* Company Name + Location */}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-base font-semibold text-gray-900 truncate">
                {truncatedCompanyName}
              </div>
              {currentBusiness?.city && currentBusiness?.state && (
                <div className="text-sm text-gray-500 truncate">
                  {currentBusiness.city}, {currentBusiness.state}
                </div>
              )}
            </div>

            {/* Dropdown Arrow - Only show if dropdown is available */}
            {(isSuperAdmin || hasMultipleBusinesses) && (
              <ChevronDown
                className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                  isBusinessDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {/* Dropdown Menu */}
          {isBusinessDropdownOpen && (isSuperAdmin || hasMultipleBusinesses) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {availableBusinesses.map((business) => (
                <button
                  key={business.business_id}
                  onClick={async () => {
                    setIsBusinessDropdownOpen(false)
                    if (business.business_id !== currentBusiness?.business_id) {
                      await setSelectedCompany(business)
                    }
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 disabled:opacity-50 transition-colors"
                >
                  {/* Business Logo */}
                  {business.avatar_url ? (
                    <ImageWithFallback
                      src={business.avatar_url}
                      alt={business.company_name}
                      className="h-8 w-8 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                      fallbackBehavior="placeholder"
                      fallbackText={business.company_name.charAt(0)}
                      extractColors={false}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {business.company_name.charAt(0)}
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {business.company_name}
                    </div>
                    {business.city && business.state && (
                      <div className="text-xs text-gray-500 truncate">
                        {business.city}, {business.state}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {extendedNavigation.map((item) => {
          const Icon = getIcon(item)
          const isActive = isActiveLink(item.href)
          const badgeCount = getBadgeCount(item.name)

          return (
            <button
              key={item.name}
              onClick={(e) => handleNavigation(item.href, e)}
              className={`relative w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              type="button"
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">{item.name}</span>

              {/* Badge for notifications */}
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-400 px-1.5 text-[11px] font-semibold text-white">
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
              onClick={(e) => handleNavigation('/admin', e)}
              className={`relative w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                pathname === '/admin'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              type="button"
            >
              <Shield className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1 text-left">Admin</span>
            </button>
          </div>
        )}
      </nav>

      {/* User Info at Bottom */}
      <div className="border-t border-gray-200 px-3 py-3">
        <button
          onClick={(e) => handleNavigation('/settings', e)}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            pathname === '/settings'
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          type="button"
        >
          <User className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.profile?.full_name || user?.email || 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {isSuperAdmin ? 'Super Admin' : 'User'}
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}
