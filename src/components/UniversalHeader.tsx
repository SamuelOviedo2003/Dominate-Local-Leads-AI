'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { AuthUser, NavigationItem, BusinessSwitcherData } from '@/types/auth'
import ImageWithFallback from './ImageWithFallback'
import UserDropdown from './UserDropdown'
import BusinessSwitcher from './BusinessSwitcher'

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
    return pathname.startsWith(href)
  }

  const isSuperAdmin = user.profile?.role === 0
  const hasMultipleBusinesses = availableBusinesses.length > 1

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-brand-slate-800/90 via-brand-slate-700/90 to-brand-orange-900/90 border-b border-white/20 shadow-2xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Main Brand Logo Section */}
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <ImageWithFallback
                  src="/images/DominateLocalLeadsLogo.webp"
                  alt="Dominate Local Leads AI"
                  className="h-10 w-auto object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                  fallbackBehavior="placeholder"
                  fallbackText="Dominate Local Leads AI"
                />
                {/* Subtle glow effect behind logo */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-orange-500/20 via-brand-orange-400/30 to-brand-orange-300/20 rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              
              {/* Separator */}
              <div className="hidden md:block w-px h-8 bg-white/20"></div>
              
              {/* Business Context Display (for current business) */}
              {user.businessData && (
                <div className="hidden md:flex items-center space-x-3">
                  {user.businessData.avatar_url ? (
                    <ImageWithFallback
                      src={user.businessData.avatar_url}
                      alt={user.businessData.company_name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-white/20"
                      fallbackBehavior="placeholder"
                      fallbackText={user.businessData.company_name?.charAt(0) || 'B'}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium border-2 border-white/20">
                      {user.businessData.company_name?.charAt(0) || 'B'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {user.businessData.company_name}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
                    isActiveLink(item.href)
                      ? 'bg-white/20 text-white shadow-lg border border-white/30'
                      : 'text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 border border-transparent'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Section - Business Switcher & User Menu */}
            <div className="flex items-center space-x-4">
              {/* Business Switcher for Super Admins - Visually Separated */}
              {isSuperAdmin && hasMultipleBusinesses && (
                <div className="hidden md:flex items-center space-x-4">
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1">
                    <BusinessSwitcher 
                      businesses={availableBusinesses}
                      currentBusinessId={user.businessData?.business_id}
                    />
                  </div>
                </div>
              )}

              {/* User Dropdown with Glass Effect */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1">
                <UserDropdown user={user} logoutAction={logoutAction} />
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/30 backdrop-blur-sm border border-white/20 transition-all duration-300"
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
            className="fixed inset-0 z-40 bg-brand-slate-800/75 backdrop-blur-sm transition-opacity md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile menu panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-gradient-to-br from-brand-slate-800 via-brand-slate-700 to-brand-orange-900 shadow-2xl transform transition-transform md:hidden backdrop-blur-xl border-l border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="text-lg font-semibold text-white">
                Navigation
              </div>
              <button
                type="button"
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="px-4 py-6 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 backdrop-blur-sm ${
                    isActiveLink(item.href)
                      ? 'bg-white/20 text-white shadow-lg border border-white/30'
                      : 'text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 border border-transparent'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Business Switcher for Mobile */}
            {isSuperAdmin && hasMultipleBusinesses && (
              <div className="px-4 py-4 border-t border-white/20">
                <div className="text-sm font-medium text-white/80 mb-3">
                  Switch Business
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-2">
                  <BusinessSwitcher 
                    businesses={availableBusinesses}
                    currentBusinessId={user.businessData?.business_id}
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