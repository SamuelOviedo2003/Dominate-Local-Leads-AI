/**
 * Client-side business navigation helpers
 * NEW: Supports business_id + permalink URL structure
 * Ensures all internal navigation preserves the current business context
 * Provides utilities for building business-aware URLs and navigation
 */

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * NEW: Extract business_id AND permalink from current pathname
 * URL structure: /business_id/permalink/section
 */
export function useCurrentBusiness(): { businessId: string | null, permalink: string | null } {
  const pathname = usePathname()

  return useMemo(() => {
    if (!pathname) return { businessId: null, permalink: null }

    const segments = pathname.split('/').filter(Boolean)
    if (segments.length < 2) return { businessId: null, permalink: null }

    const [firstSegment, secondSegment] = segments

    if (!firstSegment) return { businessId: null, permalink: null }

    // Skip special routes that aren't business routes
    const specialRoutes = ['login', 'signup', 'auth', 'forgot-password', 'super-admin', 'profile-management', 'api', '_next']
    if (specialRoutes.includes(firstSegment)) {
      return { businessId: null, permalink: null }
    }

    // Validate business_id is numeric
    if (/^\d+$/.test(firstSegment)) {
      return {
        businessId: firstSegment,
        permalink: secondSegment || null
      }
    }

    // Old URL format detected (no business_id) - return null to trigger redirect
    return { businessId: null, permalink: null }
  }, [pathname])
}

/**
 * LEGACY: Extract permalink from current pathname
 * @deprecated Use useCurrentBusiness() instead for better performance
 */
export function useCurrentPermalink(): string | null {
  const { permalink } = useCurrentBusiness()
  return permalink
}

/**
 * Get current business section from pathname
 */
export function useCurrentSection(): string {
  const pathname = usePathname()

  return useMemo(() => {
    if (!pathname) return 'dashboard'

    const segments = pathname.split('/').filter(Boolean)
    // NEW: Account for business_id (segment 0), permalink (segment 1), section (segment 2)
    if (segments.length >= 3) {
      return segments[2] || 'dashboard'
    }

    return 'dashboard'
  }, [pathname])
}

/**
 * NEW: Build a business-aware URL with business_id + permalink
 */
export function useBusinessUrl() {
  const { businessId, permalink } = useCurrentBusiness()

  return useCallback((path: string, options?: { businessId?: string, permalink?: string }) => {
    const targetBusinessId = options?.businessId || businessId
    const targetPermalink = options?.permalink || permalink

    if (!targetBusinessId || !targetPermalink) {
      // No business context available for URL generation
      return path
    }

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    // If path already includes the business_id/permalink, don't double it
    if (cleanPath.startsWith(`/${targetBusinessId}/${targetPermalink}/`)) {
      return cleanPath
    }

    return `/${targetBusinessId}/${targetPermalink}${cleanPath}`
  }, [businessId, permalink])
}

/**
 * LEGACY: Build a permalink-aware URL
 * @deprecated Use useBusinessUrl() instead for new code
 */
export function usePermalinkUrl() {
  const buildUrl = useBusinessUrl()
  return buildUrl
}

/**
 * NEW: Navigate while preserving current business context
 */
export function useBusinessNavigation() {
  const router = useRouter()
  const buildUrl = useBusinessUrl()

  const navigate = useCallback((path: string, options?: { businessId?: string; permalink?: string; replace?: boolean }) => {
    const { businessId, permalink, replace = false } = options || {}
    const url = buildUrl(path, { businessId, permalink })

    if (replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  }, [router, buildUrl])

  const navigateToSection = useCallback((section: string, options?: { businessId?: string; permalink?: string; replace?: boolean }) => {
    navigate(`/${section}`, options)
  }, [navigate])

  const navigateToDashboard = useCallback((options?: { businessId?: string; permalink?: string; replace?: boolean }) => {
    navigateToSection('dashboard', options)
  }, [navigateToSection])

  return {
    navigate,
    navigateToSection,
    navigateToDashboard,
    buildUrl
  }
}

/**
 * LEGACY: Navigate while preserving current permalink
 * @deprecated Use useBusinessNavigation() instead
 */
export function usePermalinkNavigation() {
  return useBusinessNavigation()
}

/**
 * NEW: Generate navigation items with current business context
 */
export function useBusinessNavItems() {
  const { businessId, permalink } = useCurrentBusiness()
  const currentSection = useCurrentSection()
  const buildUrl = useBusinessUrl()

  return useMemo(() => {
    if (!businessId || !permalink) {
      return []
    }

    const baseItems = [
      { name: 'Dashboard', section: 'dashboard', href: buildUrl('/dashboard') },
      { name: 'New Leads', section: 'new-leads', href: buildUrl('/new-leads') },
      { name: 'Bookings', section: 'bookings', href: buildUrl('/bookings') },
      { name: 'Incoming Calls', section: 'incoming-calls', href: buildUrl('/incoming-calls') }
    ]

    return baseItems.map(item => ({
      ...item,
      isActive: item.section === currentSection,
      businessId,
      permalink
    }))
  }, [businessId, permalink, currentSection, buildUrl])
}

/**
 * LEGACY: Generate navigation items with current permalink
 * @deprecated Use useBusinessNavItems() instead
 */
export function usePermalinkNavItems() {
  return useBusinessNavItems()
}

/**
 * NEW: Business switcher helper - navigate to different business
 * Supports both business_id and permalink for flexibility
 */
export function useBusinessSwitcher() {
  const router = useRouter()
  const currentSection = useCurrentSection()

  const switchToBusiness = useCallback((
    businessId: string,
    permalink: string,
    section?: string
  ) => {
    const targetSection = section || currentSection || 'dashboard'
    const url = `/${businessId}/${permalink}/${targetSection}`

    router.push(url)
  }, [router, currentSection])

  const switchToBusinessDashboard = useCallback((businessId: string, permalink: string) => {
    switchToBusiness(businessId, permalink, 'dashboard')
  }, [switchToBusiness])

  return {
    switchToBusiness,
    switchToBusinessDashboard,
    currentSection
  }
}

/**
 * NEW: Business-aware Link component props helper
 */
export function useBusinessLinkProps(path: string, options?: { businessId?: string; permalink?: string }) {
  const buildUrl = useBusinessUrl()

  return useMemo(() => {
    const href = buildUrl(path, options)

    return {
      href,
      onClick: (e: React.MouseEvent) => {
        // Reserved for future navigation tracking
      }
    }
  }, [buildUrl, path, options?.businessId, options?.permalink])
}

/**
 * LEGACY: Permalink-aware Link component props helper
 * @deprecated Use useBusinessLinkProps() instead
 */
export function usePermalinkLinkProps(path: string, options?: { permalink?: string }) {
  const buildUrl = useBusinessUrl()
  return useMemo(() => ({
    href: buildUrl(path, options),
    onClick: (e: React.MouseEvent) => {}
  }), [buildUrl, path, options?.permalink])
}

/**
 * NEW: Get breadcrumb data for current location
 */
export function useBusinessBreadcrumbs() {
  const { businessId, permalink } = useCurrentBusiness()
  const currentSection = useCurrentSection()
  const buildUrl = useBusinessUrl()

  return useMemo(() => {
    if (!businessId || !permalink) {
      return []
    }

    const breadcrumbs = [
      {
        name: 'Business',
        href: buildUrl('/dashboard'),
        isActive: false
      }
    ]

    // Add current section if not dashboard
    if (currentSection && currentSection !== 'dashboard') {
      const sectionNames = {
        'new-leads': 'New Leads',
        'bookings': 'Bookings',
        'incoming-calls': 'Incoming Calls',
        'lead-details': 'Lead Details'
      } as const

      breadcrumbs.push({
        name: sectionNames[currentSection as keyof typeof sectionNames] || currentSection,
        href: buildUrl(`/${currentSection}`),
        isActive: true
      })
    } else if (breadcrumbs.length > 0 && breadcrumbs[0]) {
      breadcrumbs[0].isActive = true
    }

    return breadcrumbs
  }, [businessId, permalink, currentSection, buildUrl])
}

/**
 * LEGACY: Get breadcrumb data for current location
 * @deprecated Use useBusinessBreadcrumbs() instead
 */
export function usePermalinkBreadcrumbs() {
  return useBusinessBreadcrumbs()
}

/**
 * NEW: Check if a URL is internal to the current business
 */
export function useIsInternalUrl() {
  const { businessId, permalink } = useCurrentBusiness()

  return useCallback((url: string) => {
    if (!businessId || !permalink) return false

    // Check if URL starts with current business context
    return url.startsWith(`/${businessId}/${permalink}/`) || url === `/${businessId}/${permalink}`
  }, [businessId, permalink])
}

/**
 * Determines the appropriate target page/section when switching businesses based on current route
 * Handles edge case where users are in detail views that might not exist in the new business
 */
export function determineTargetPageForBusinessSwitch(pathname: string): string {
  // Handle detail view redirects to prevent 404 errors when switching businesses
  if (pathname.includes('/lead-details/')) {
    // Redirect from Lead Details to New Leads section in the new business
    return 'new-leads'
  }

  if (pathname.includes('/actions/')) {
    // Redirect from Actions to New Leads section in the new business
    return 'new-leads'
  }

  if (pathname.includes('/property-details/')) {
    // Redirect from Property Details to Bookings section in the new business
    return 'bookings'
  }

  // For non-detail pages, try to maintain the same section
  const pathSegments = pathname.split('/').filter(Boolean)

  // NEW: Skip business_id (segment 0) and permalink (segment 1), get section (segment 2)
  const currentSection = pathSegments[2] || 'dashboard'

  // List of valid sections that can be preserved across business switches
  const validSections = [
    'dashboard',
    'new-leads',
    'incoming-calls',
    'bookings',
    'profile-management'
  ]

  // If current section is valid, preserve it; otherwise default to dashboard
  return validSections.includes(currentSection) ? currentSection : 'dashboard'
}

/**
 * NEW: Get business context for child components
 */
export function useBusinessContext() {
  const { businessId, permalink } = useCurrentBusiness()
  const currentSection = useCurrentSection()
  const buildUrl = useBusinessUrl()
  const navigation = useBusinessNavigation()
  const navItems = useBusinessNavItems()
  const breadcrumbs = useBusinessBreadcrumbs()
  const businessSwitcher = useBusinessSwitcher()
  const isInternalUrl = useIsInternalUrl()

  return {
    businessId,
    permalink,
    section: currentSection,
    buildUrl,
    navigation,
    navItems,
    breadcrumbs,
    businessSwitcher,
    isInternalUrl,

    // Utility functions
    utils: {
      buildBusinessUrl: (path: string, options?: { businessId?: string; permalink?: string }) => buildUrl(path, options),
      navigateToSection: navigation.navigateToSection,
      switchBusiness: businessSwitcher.switchToBusiness,
      determineBusinessSwitchTarget: determineTargetPageForBusinessSwitch
    }
  }
}

/**
 * LEGACY: Get permalink context for child components
 * @deprecated Use useBusinessContext() instead
 */
export function usePermalinkContext() {
  return useBusinessContext()
}