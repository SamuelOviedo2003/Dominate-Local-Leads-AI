/**
 * Utility functions for permalink-based URL generation
 * Ensures consistent URL building across the application
 */

/**
 * Creates a permalink-aware URL by prepending the business permalink
 * @param path - The path to append (e.g., '/dashboard', '/new-leads')
 * @param permalink - The business permalink
 * @returns Permalink-aware URL
 */
export function withPermalink(path: string, permalink: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${permalink}${cleanPath}`
}

/**
 * Gets a business-specific URL for a given section
 * @param section - The section name (e.g., 'dashboard', 'new-leads', 'bookings')
 * @param permalink - The business permalink
 * @returns Complete business-specific URL
 */
export function getBusinessUrl(section: string, permalink: string): string {
  return `/${permalink}/${section}`
}

/**
 * Extracts the current page section from a pathname
 * @param pathname - Current pathname (e.g., '/houston-custom-renovations/new-leads')
 * @returns The section name or 'dashboard' as fallback
 */
export function extractCurrentSection(pathname: string): string {
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length >= 2) {
    return pathParts[1] || 'dashboard'
  }
  return 'dashboard'
}

/**
 * Extracts the business permalink from a pathname
 * @param pathname - Current pathname (e.g., '/houston-custom-renovations/new-leads')
 * @returns The permalink or null if not found
 */
export function extractPermalinkFromPath(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length >= 1 && pathParts[0]) {
    return pathParts[0]
  }
  return null
}

/**
 * Checks if a pathname is using permalink-based routing
 * @param pathname - Current pathname
 * @returns true if the path appears to be permalink-based
 */
export function isPermalinkPath(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean)
  const firstPart = pathParts[0]
  return pathParts.length >= 2 && Boolean(firstPart) && !firstPart?.startsWith('(') // Not a route group
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
  { name: 'Bookings', section: 'bookings' },
  { name: 'Incoming Calls', section: 'incoming-calls' }
] as const

/**
 * Super admin only navigation sections
 */
export const SUPER_ADMIN_SECTIONS = [
  { name: 'Profile Management', section: 'profile-management' }
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
 * Generates permalink-aware navigation links for a business
 * @param permalink - The business permalink
 * @param isSuperAdmin - Whether the user is a super admin
 * @returns Array of navigation items with permalink-aware hrefs
 */
export function generatePermalinkNavigation(permalink: string, isSuperAdmin: boolean = false) {
  const sections = getNavigationSections(isSuperAdmin)
  return sections.map(({ name, section }) => ({
    name,
    href: getBusinessUrl(section, permalink),
    section
  }))
}