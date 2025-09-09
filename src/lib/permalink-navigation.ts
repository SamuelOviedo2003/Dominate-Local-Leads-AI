/**
 * Client-side permalink navigation helpers
 * Ensures all internal navigation preserves the current business permalink
 * Provides utilities for building permalink-aware URLs and navigation
 */

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * Extract permalink from current pathname
 */
export function useCurrentPermalink(): string | null {
  const pathname = usePathname()
  
  return useMemo((): string | null => {
    if (!pathname) return null
    
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return null
    
    // First segment should be the permalink (unless it's a special route)
    const firstSegment = segments[0]
    
    if (!firstSegment) return null
    
    // Skip special routes that aren't permalinks
    const specialRoutes = ['login', 'signup', 'auth', 'forgot-password', 'super-admin', 'profile-management', 'api', '_next']
    if (specialRoutes.includes(firstSegment)) {
      return null
    }
    
    return firstSegment
  }, [pathname])
}

/**
 * Get current business section from pathname
 */
export function useCurrentSection(): string {
  const pathname = usePathname()
  
  return useMemo(() => {
    if (!pathname) return 'dashboard'
    
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length >= 2) {
      return segments[1] || 'dashboard'
    }
    
    return 'dashboard'
  }, [pathname])
}

/**
 * Build a permalink-aware URL
 */
export function usePermalinkUrl() {
  const currentPermalink = useCurrentPermalink()
  
  return useCallback((path: string, permalink?: string) => {
    const targetPermalink = permalink || currentPermalink
    
    if (!targetPermalink) {
      console.warn('No permalink available for URL generation:', path)
      return path
    }
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    
    // If path already includes the permalink, don't double it
    if (cleanPath.startsWith(`/${targetPermalink}/`)) {
      return cleanPath
    }
    
    return `/${targetPermalink}${cleanPath}`
  }, [currentPermalink])
}

/**
 * Navigate while preserving current permalink
 */
export function usePermalinkNavigation() {
  const router = useRouter()
  const buildUrl = usePermalinkUrl()
  
  const navigate = useCallback((path: string, options?: { permalink?: string; replace?: boolean }) => {
    const { permalink, replace = false } = options || {}
    const url = buildUrl(path, permalink)
    
    console.log(`[NAVIGATION] Navigating to: ${url}`)
    
    if (replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  }, [router, buildUrl])
  
  const navigateToSection = useCallback((section: string, options?: { permalink?: string; replace?: boolean }) => {
    navigate(`/${section}`, options)
  }, [navigate])
  
  const navigateToDashboard = useCallback((options?: { permalink?: string; replace?: boolean }) => {
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
 * Generate navigation items with current permalink
 */
export function usePermalinkNavItems() {
  const currentPermalink = useCurrentPermalink()
  const currentSection = useCurrentSection()
  const buildUrl = usePermalinkUrl()
  
  return useMemo(() => {
    if (!currentPermalink) {
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
      permalink: currentPermalink
    }))
  }, [currentPermalink, currentSection, buildUrl])
}

/**
 * Business switcher helper - navigate to different business
 */
export function useBusinessSwitcher() {
  const router = useRouter()
  const currentSection = useCurrentSection()
  
  const switchToBusiness = useCallback((permalink: string, section?: string) => {
    const targetSection = section || currentSection || 'dashboard'
    const url = `/${permalink}/${targetSection}`
    
    console.log(`[BUSINESS-SWITCHER] Switching to business: ${permalink}, section: ${targetSection}`)
    router.push(url)
  }, [router, currentSection])
  
  const switchToBusinessDashboard = useCallback((permalink: string) => {
    switchToBusiness(permalink, 'dashboard')
  }, [switchToBusiness])
  
  return {
    switchToBusiness,
    switchToBusinessDashboard,
    currentSection
  }
}

/**
 * Permalink-aware Link component props helper
 */
export function usePermalinkLinkProps(path: string, options?: { permalink?: string }) {
  const buildUrl = usePermalinkUrl()
  
  return useMemo(() => {
    const href = buildUrl(path, options?.permalink)
    
    return {
      href,
      onClick: (e: React.MouseEvent) => {
        // Log navigation for debugging
        console.log(`[LINK] Navigating to: ${href}`)
      }
    }
  }, [buildUrl, path, options?.permalink])
}

/**
 * Get breadcrumb data for current location
 */
export function usePermalinkBreadcrumbs() {
  const currentPermalink = useCurrentPermalink()
  const currentSection = useCurrentSection()
  const buildUrl = usePermalinkUrl()
  
  return useMemo(() => {
    if (!currentPermalink) {
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
  }, [currentPermalink, currentSection, buildUrl])
}

/**
 * Check if a URL is internal to the current business
 */
export function useIsInternalUrl() {
  const currentPermalink = useCurrentPermalink()
  
  return useCallback((url: string) => {
    if (!currentPermalink) return false
    
    // Check if URL starts with current permalink
    return url.startsWith(`/${currentPermalink}/`) || url === `/${currentPermalink}`
  }, [currentPermalink])
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
  
  if (pathname.includes('/property-details/')) {
    // Redirect from Property Details to Bookings section in the new business
    return 'bookings'
  }
  
  // For non-detail pages, try to maintain the same section
  const pathSegments = pathname.split('/').filter(Boolean)
  
  // Skip the permalink (first segment) and get the section
  const currentSection = pathSegments[1] || 'dashboard'
  
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
 * Get permalink context for child components
 */
export function usePermalinkContext() {
  const currentPermalink = useCurrentPermalink()
  const currentSection = useCurrentSection()
  const buildUrl = usePermalinkUrl()
  const navigation = usePermalinkNavigation()
  const navItems = usePermalinkNavItems()
  const breadcrumbs = usePermalinkBreadcrumbs()
  const businessSwitcher = useBusinessSwitcher()
  const isInternalUrl = useIsInternalUrl()
  
  return {
    permalink: currentPermalink,
    section: currentSection,
    buildUrl,
    navigation,
    navItems,
    breadcrumbs,
    businessSwitcher,
    isInternalUrl,
    
    // Utility functions
    utils: {
      buildPermalinkUrl: (path: string, permalink?: string) => buildUrl(path, permalink),
      navigateToSection: navigation.navigateToSection,
      switchBusiness: businessSwitcher.switchToBusiness,
      determineBusinessSwitchTarget: determineTargetPageForBusinessSwitch
    }
  }
}