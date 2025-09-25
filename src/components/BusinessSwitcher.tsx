'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { BusinessSwitcherData } from '@/types/auth'
import ImageWithFallback from './ImageWithFallback'
import { useBusinessContext, useCurrentBusiness } from '@/contexts/BusinessContext'
import { useDynamicTheme } from '@/contexts/DynamicThemeContext'
import { ExtractedColors, invalidateColorCache } from '@/lib/color-extraction'

interface BusinessSwitcherProps {
  isMobile?: boolean
  showDropdown?: boolean
  onBusinessChange?: (businessId: string) => void
}

export default function BusinessSwitcher({ 
  isMobile = false,
  showDropdown = true,
  onBusinessChange 
}: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { switchBusiness, isLoading, availableBusinesses, currentBusinessId, setSelectedCompany } = useBusinessContext()
  const currentBusiness = useCurrentBusiness()
  const { extractColors } = useDynamicTheme()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // currentBusiness is now provided by useCurrentBusiness() hook

  // Initialize color extraction on mount and when business changes
  useEffect(() => {
    if (currentBusiness?.business_id && currentBusiness.avatar_url) {
      extractColors(currentBusiness.avatar_url, currentBusiness.business_id)
    }
  }, [currentBusiness?.business_id, currentBusiness?.avatar_url]) // Removed extractColors to prevent infinite loop

  // Handle color extraction from business logo
  const handleColorsExtracted = (colors: ExtractedColors) => {
    if (currentBusiness?.business_id && currentBusiness.avatar_url) {
      // Extract colors without cache invalidation to prevent race conditions
      extractColors(currentBusiness.avatar_url, currentBusiness.business_id)
    }
  }

  const handleBusinessSelect = async (businessId: string) => {
    setIsOpen(false)
    
    if (onBusinessChange) {
      // Use custom handler if provided
      onBusinessChange(businessId)
    } else {
      // Use setSelectedCompany which handles both backend switching and URL redirect
      const selectedBusiness = availableBusinesses.find(b => b.business_id === businessId)
      if (selectedBusiness) {
        try {
          await setSelectedCompany(selectedBusiness)
          // setSelectedCompany handles the URL redirect automatically
        } catch (error) {
          // Failed to switch business
          // Show user-friendly error message
          alert(`Failed to switch business: ${error}`)
        }
      } else {
        // Selected business not found in available businesses
        alert('Selected business not found')
      }
    }
  }

  // If no dropdown functionality is needed, just display the company info
  if (!showDropdown || (showDropdown && availableBusinesses.length <= 1)) {
    // Handle case where no business data is available
    if (!currentBusiness && isLoading) {
      return (
        <div className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gray-400 animate-pulse rounded-full"></div>
          <div>
            <div className="w-32 h-4 bg-gray-400 animate-pulse rounded"></div>
            <div className="w-20 h-3 bg-gray-300 animate-pulse rounded mt-1"></div>
          </div>
        </div>
      )
    }
    
    if (!currentBusiness && !isLoading) {
      return (
        <div className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
            !
          </div>
          <div>
            <div className="text-base font-bold text-red-400 leading-tight">
              No Business Access
            </div>
            <div className="text-xs text-red-300 leading-tight">
              Contact administrator
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-3 group">
        {/* Company Logo/Avatar */}
        {currentBusiness?.avatar_url ? (
          <ImageWithFallback
            src={currentBusiness.avatar_url}
            alt={currentBusiness.company_name}
            className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-400/50 shadow-lg transition-all duration-300 group-hover:border-brand-orange-400 group-hover:scale-105"
            fallbackBehavior="placeholder"
            fallbackText={currentBusiness.company_name?.charAt(0) || 'B'}
            extractColors={true}
            onColorsExtracted={handleColorsExtracted}
            businessId={currentBusiness.business_id}
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 text-white rounded-full flex items-center justify-center text-lg font-bold border-2 border-brand-orange-400/50 shadow-lg transition-all duration-300 group-hover:border-brand-orange-400 group-hover:scale-105">
            {currentBusiness?.company_name?.charAt(0) || 'B'}
          </div>
        )}
        
        {/* Company Name */}
        <div className="flex items-center space-x-2">
          <div>
            <div className="text-base font-bold text-white leading-tight">
              {currentBusiness?.company_name}
            </div>
            {currentBusiness?.city && currentBusiness?.state && (
              <div className="text-xs text-white/70 leading-tight">
                {currentBusiness.city}, {currentBusiness.state}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Now displays the full company info with dropdown arrow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 group transition-all duration-300 ${
          isMobile 
            ? 'w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20' 
            : 'bg-transparent hover:bg-white/10 rounded-lg px-2 py-1'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch business"
      >
        {/* Company Logo/Avatar */}
        {currentBusiness?.avatar_url ? (
          <ImageWithFallback
            src={currentBusiness.avatar_url}
            alt={currentBusiness.company_name}
            className={`rounded-full object-cover border-2 border-brand-orange-400/50 shadow-lg transition-all duration-300 group-hover:border-brand-orange-400 group-hover:scale-105 ${
              isMobile ? 'h-8 w-8' : 'h-10 w-10'
            }`}
            fallbackBehavior="placeholder"
            fallbackText={currentBusiness.company_name?.charAt(0) || 'B'}
            extractColors={true}
            onColorsExtracted={handleColorsExtracted}
            businessId={currentBusiness.business_id}
          />
        ) : (
          <div className={`bg-gradient-to-r from-brand-orange-500 to-brand-orange-600 text-white rounded-full flex items-center justify-center font-bold border-2 border-brand-orange-400/50 shadow-lg transition-all duration-300 group-hover:border-brand-orange-400 group-hover:scale-105 ${
            isMobile ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg'
          }`}>
            {currentBusiness?.company_name?.charAt(0) || 'B'}
          </div>
        )}
        
        {/* Company Name */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <div className={`font-bold text-white leading-tight truncate ${
              isMobile ? 'text-sm' : 'text-base'
            }`}>
              {currentBusiness?.company_name || (isLoading ? 'Loading...' : 'No Business Access')}
            </div>
            {currentBusiness?.city && currentBusiness?.state && (
              <div className={`text-white/70 leading-tight truncate ${
                isMobile ? 'text-xs' : 'text-xs'
              }`}>
                {currentBusiness.city}, {currentBusiness.state}
              </div>
            )}
          </div>
          
          {/* Dropdown Arrow */}
          <ChevronDown 
            className={`text-white/80 transition-transform ${
              isOpen ? 'rotate-180' : ''
            } ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} 
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute z-50 ${
          isMobile 
            ? 'left-0 right-0 mt-2' 
            : 'right-0 mt-2 w-80'
        } bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-64 overflow-y-auto`}>
          
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Switch Business
            </div>
          </div>

          {/* Business List */}
          <div className="py-1" role="listbox">
            {availableBusinesses.map((business) => {
              const isSelected = business.business_id === currentBusinessId
              
              return (
                <button
                  key={business.business_id}
                  onClick={() => handleBusinessSelect(business.business_id)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 group transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Business Avatar */}
                  <div className="flex-shrink-0">
                    {business.avatar_url ? (
                      <ImageWithFallback
                        src={business.avatar_url}
                        alt={business.company_name}
                        className="w-8 h-8 rounded-full object-cover"
                        fallbackBehavior="placeholder"
                        fallbackText={business.company_name.charAt(0)}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {business.company_name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {business.company_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {business.city && business.state 
                        ? `${business.city}, ${business.state}`
                        : ''
                      }
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}