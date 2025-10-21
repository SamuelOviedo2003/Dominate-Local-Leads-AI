/**
 * Utility functions for business-aware URL generation
 * NEW: Supports business_id + permalink structure
 * Ensures consistent URL building across the application
 */

/**
 * NEW: Creates a business-aware URL with business_id and permalink
 * @param path - The path to append (e.g., '/dashboard', '/new-leads')
 * @param businessId - The business ID
 * @param permalink - The business permalink
 * @returns Business-aware URL
 */
export function withBusiness(path: string, businessId: string | number, permalink: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${businessId}/${permalink}${cleanPath}`
}

/**
 * LEGACY: Creates a permalink-aware URL by prepending the business permalink
 * @deprecated Use withBusiness() instead for new code
 */
export function withPermalink(path: string, permalink: string): string {
  // For legacy support, try to extract business_id from context
  // This is a fallback - new code should use withBusiness()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${permalink}${cleanPath}` // Old format for backward compatibility
}

/**
 * NEW: Gets a business-specific URL for a given section
 * @param section - The section name (e.g., 'dashboard', 'new-leads', 'bookings')
 * @param businessId - The business ID
 * @param permalink - The business permalink
 * @returns Complete business-specific URL
 */
export function getBusinessUrl(section: string, businessId: string | number, permalink: string): string {
  return `/${businessId}/${permalink}/${section}`
}

/**
 * LEGACY: Gets a business-specific URL for a given section (old format)
 * @deprecated Use getBusinessUrl(section, businessId, permalink) instead
 */
export function getLegacyBusinessUrl(section: string, permalink: string): string {
  return `/${permalink}/${section}`
}

/**
 * NEW: Extracts the current page section from a pathname
 * @param pathname - Current pathname (e.g., '/1234/houston-custom-renovations/new-leads')
 * @returns The section name or 'dashboard' as fallback
 */
export function extractCurrentSection(pathname: string): string {
  const pathParts = pathname.split('/').filter(Boolean)
  // NEW: Account for business_id (segment 0), permalink (segment 1), section (segment 2)
  if (pathParts.length >= 3 && pathParts[0] && /^\d+$/.test(pathParts[0])) {
    return pathParts[2] || 'dashboard'
  }
  // LEGACY: Old format without business_id
  if (pathParts.length >= 2) {
    return pathParts[1] || 'dashboard'
  }
  return 'dashboard'
}

/**
 * NEW: Extracts business_id and permalink from pathname
 * @param pathname - Current pathname (e.g., '/1234/houston-custom-renovations/new-leads')
 * @returns Object with businessId and permalink, or nulls if not found
 */
export function extractBusinessFromPath(pathname: string): { businessId: string | null, permalink: string | null } {
  const pathParts = pathname.split('/').filter(Boolean)

  // NEW: Check for business_id + permalink format
  if (pathParts.length >= 2 && pathParts[0] && /^\d+$/.test(pathParts[0])) {
    return {
      businessId: pathParts[0],
      permalink: pathParts[1] || null
    }
  }

  // LEGACY: Old format (just permalink, no business_id)
  if (pathParts.length >= 1 && pathParts[0]) {
    return {
      businessId: null,
      permalink: pathParts[0]
    }
  }

  return { businessId: null, permalink: null }
}

/**
 * LEGACY: Extracts the business permalink from a pathname
 * @deprecated Use extractBusinessFromPath() instead
 */
export function extractPermalinkFromPath(pathname: string): string | null {
  const { permalink } = extractBusinessFromPath(pathname)
  return permalink
}

/**
 * NEW: Checks if a pathname is using business-based routing (with business_id)
 * @param pathname - Current pathname
 * @returns true if the path appears to be business-based with business_id
 */
export function isBusinessPath(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean)
  const firstPart = pathParts[0]
  // Must have at least business_id + permalink, and first part must be numeric
  if (!firstPart) return false
  return pathParts.length >= 2 && /^\d+$/.test(firstPart) && !firstPart.startsWith('(')
}

/**
 * LEGACY: Checks if a pathname is using permalink-based routing
 * @deprecated Use isBusinessPath() instead
 */
export function isPermalinkPath(pathname: string): boolean {
  return isBusinessPath(pathname)
}

/**
 * Checks if a route is a permalink route (has business-specific content)
 * @param pathname - Current pathname
 * @returns true if this is a route that should be under a permalink
 */
export function isPermalinkRoute(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean)
  
  if (pathParts.length === 0) return false
  
  // Skip special routes that aren't permalinks
  const specialRoutes = ['login', 'signup', 'auth', 'forgot-password', 'super-admin', 'profile-management', 'api', '_next']
  const firstSegment = pathParts[0]
  
  if (firstSegment && specialRoutes.includes(firstSegment)) {
    return false
  }
  
  // If we have at least one segment and it's not a special route, it's likely a permalink route
  return true
}

/**
 * Navigation items with their section names
 * Used to generate permalink-aware navigation links
 */
export const NAVIGATION_SECTIONS = [
  { name: 'Dashboard', section: 'dashboard' },
  { name: 'New Leads', section: 'new-leads' },
  { name: 'Follow Up', section: 'follow-up' },
  { name: 'Waiting to Call', section: 'waiting-to-call' },
  { name: 'Bookings', section: 'bookings' },
  { name: 'Incoming Calls', section: 'incoming-calls' }
] as const

/**
 * Super admin only navigation sections
 * NOTE: Profile Management has been moved to UserDropdown (Feature 3)
 */
export const SUPER_ADMIN_SECTIONS = [
  // Profile Management removed from navigation - now in dropdown menu
] as const

/**
 * Gets navigation items for a user based on their role
 * @param isSuperAdmin - Whether the user is a super admin
 * @returns Array of navigation items
 */
export function getNavigationSections(isSuperAdmin: boolean) {
  type NavigationSection = (typeof NAVIGATION_SECTIONS)[number] | (typeof SUPER_ADMIN_SECTIONS)[number]
  const items: NavigationSection[] = [...NAVIGATION_SECTIONS]
  if (isSuperAdmin) {
    items.push(...SUPER_ADMIN_SECTIONS)
  }
  return items
}

/**
 * NEW: Generates business-aware navigation links
 * @param businessId - The business ID
 * @param permalink - The business permalink
 * @param isSuperAdmin - Whether the user is a super admin
 * @returns Array of navigation items with business-aware hrefs
 */
export function generateBusinessNavigation(businessId: string | number, permalink: string, isSuperAdmin: boolean = false) {
  const sections = getNavigationSections(isSuperAdmin)
  return sections.map(({ name, section }) => ({
    name,
    href: getBusinessUrl(section, businessId, permalink),
    section
  }))
}

/**
 * LEGACY: Generates permalink-aware navigation links for a business
 * @deprecated Use generateBusinessNavigation(businessId, permalink, isSuperAdmin) instead
 */
export function generatePermalinkNavigation(permalink: string, isSuperAdmin: boolean = false) {
  // Legacy fallback - tries to work without business_id
  const sections = getNavigationSections(isSuperAdmin)
  return sections.map(({ name, section }) => ({
    name,
    href: getLegacyBusinessUrl(section, permalink),
    section
  }))
}