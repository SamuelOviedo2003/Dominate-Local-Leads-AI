'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, ChevronDown } from 'lucide-react'
import { AuthUser, NavigationItem, BusinessSwitcherData } from '@/types/auth'
import ImageWithFallback from './ImageWithFallback'
import UserDropdown from './UserDropdown'
import BusinessSwitcher from './BusinessSwitcher'
import { useDynamicTheme, useThemeStyles } from '@/contexts/DynamicThemeContext'
import { ExtractedColors } from '@/lib/color-extraction'

interface UniversalHeaderProps {
  user: AuthUser
  logoutAction: () => void
  availableBusinesses?: BusinessSwitcherData[]
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'New Leads', href: '/new-leads' },
  { name: 'Salesman', href: '/salesman' },
  { name: 'Incoming Calls', href: '/incoming-calls' },
  { name: 'FB Analysis', href: '/fb-analysis' },
]

export default function UniversalHeader({ 
  user, 
  logoutAction, 
  availableBusinesses = [] 
}: UniversalHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { state: themeState, extractColors } = useDynamicTheme()
  const themeStyles = useThemeStyles()

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    if (href === '/new-leads') {
      return pathname === '/new-leads'
    }
    return pathname.startsWith(href)
  }

  const isSuperAdmin = user.profile?.role === 0
  const hasMultipleBusinesses = availableBusinesses.length > 1

  // Initialize fallback color extraction when no business data
  useEffect(() => {
    if (!user.businessData?.avatar_url) {
      console.log('[UNIVERSAL HEADER] Initializing fallback logo color extraction')
      extractColors('/images/DominateLocalLeadsLogo.webp', 'main-logo')
    }
  }, [user.businessData?.avatar_url, extractColors])

  // Handle color extraction from fallback main logo
  const handleFallbackColorsExtracted = (colors: ExtractedColors) => {
    console.log('[UNIVERSAL HEADER] Fallback colors extracted:', colors)
    // Colors are automatically handled by the ImageWithFallback component
  }

  // Generate dynamic header style
  const headerStyle = {
    background: `linear-gradient(to right, ${themeState.colors.primaryDark}e6, ${themeState.colors.accent}e6, ${themeState.colors.primary}e6)`
  }

  return (
    <>
      <header 
        className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/20 shadow-2xl transition-all duration-600 ease-out"
        style={headerStyle}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Far Left: Company Selector/Logo */}
            <div className="flex items-center space-x-3">
              {user.businessData ? (
                <BusinessSwitcher 
                  businesses={availableBusinesses}
                  currentBusinessId={user.businessData?.business_id}
                  showDropdown={isSuperAdmin && hasMultipleBusinesses}
                  businessData={user.businessData}
                />
              ) : (
                /* Fallback to main logo if no business data */
                <div className="relative group">
                  <ImageWithFallback
                    src="/images/DominateLocalLeadsLogo.webp"
                    alt="Dominate Local Leads AI"
                    className="h-10 w-auto object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                    fallbackBehavior="placeholder"
                    fallbackText="Dominate Local Leads AI"
                    extractColors={true}
                    onColorsExtracted={handleFallbackColorsExtracted}
                    businessId="main-logo"
                  />
                  <div 
                    className="absolute inset-0 -z-10 rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle, ${themeState.colors.primary}33, ${themeState.colors.primaryLight}4d, ${themeState.colors.primaryDark}33)`
                    }}
                  ></div>
                </div>
              )}
            </div>

            {/* Center: Navigation Buttons */}
            <nav className="hidden lg:flex items-center space-x-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm touch-target ${
                    isActiveLink(item.href)
                      ? 'bg-white/25 text-white shadow-lg border border-white/40 scale-105'
                      : 'text-white/85 hover:text-white hover:bg-white/15 hover:border-white/30 hover:scale-105 border border-transparent'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Far Right: Profile Section */}
            <div className="flex items-center space-x-3">
              {/* User Dropdown with Glass Effect */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 shadow-lg">
                <UserDropdown user={user} logoutAction={logoutAction} />
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-orange-400/50 backdrop-blur-sm border border-white/20 transition-all duration-300 touch-target"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-brand-slate-800/75 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile menu panel */}
          <div 
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-2xl transform transition-transform lg:hidden backdrop-blur-xl border-l border-white/20"
            style={{
              background: `linear-gradient(to bottom right, ${themeState.colors.primaryDark}, ${themeState.colors.accent}, ${themeState.colors.primary})`
            }}
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="text-lg font-semibold text-white">
                Navigation
              </div>
              <button
                type="button"
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 touch-target"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="px-6 py-6 space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-5 py-4 rounded-xl text-base font-semibold transition-all duration-300 backdrop-blur-sm touch-target ${
                    isActiveLink(item.href)
                      ? 'bg-white/25 text-white shadow-lg border border-white/40'
                      : 'text-white/85 hover:text-white hover:bg-white/15 hover:border-white/30 border border-transparent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile Business Switcher */}
            {isSuperAdmin && hasMultipleBusinesses && (
              <div className="px-6 py-4 border-t border-white/20">
                <div className="text-sm font-semibold text-white/90 mb-4">
                  Switch Business
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg">
                  <BusinessSwitcher 
                    businesses={availableBusinesses}
                    currentBusinessId={user.businessData?.business_id}
                    businessData={user.businessData}
                    showDropdown={true}
                    isMobile={true}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}