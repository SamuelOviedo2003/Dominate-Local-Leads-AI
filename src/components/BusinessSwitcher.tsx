'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { BusinessSwitcherData } from '@/types/auth'
import ImageWithFallback from './ImageWithFallback'

interface BusinessSwitcherProps {
  businesses: BusinessSwitcherData[]
  currentBusinessId?: string
  isMobile?: boolean
  onBusinessChange?: (businessId: string) => void
}

export default function BusinessSwitcher({ 
  businesses, 
  currentBusinessId, 
  isMobile = false,
  onBusinessChange 
}: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const currentBusiness = businesses.find(b => b.business_id === currentBusinessId)

  const handleBusinessSelect = async (businessId: string) => {
    setIsOpen(false)
    
    if (onBusinessChange) {
      onBusinessChange(businessId)
    } else {
      // Default behavior: reload page with new business context
      // This could be enhanced with a proper business switching mechanism
      window.location.reload()
    }
  }

  if (businesses.length <= 1) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
          isMobile 
            ? 'w-full text-left bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20' 
            : 'bg-transparent hover:bg-white/10 text-white'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch business"
      >
        <Building2 className="w-4 h-4 text-white/80" />
        
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {currentBusiness?.avatar_url ? (
            <ImageWithFallback
              src={currentBusiness.avatar_url}
              alt={currentBusiness.company_name}
              className="w-6 h-6 rounded-full object-cover"
              fallbackBehavior="placeholder"
              fallbackText={currentBusiness.company_name.charAt(0)}
            />
          ) : (
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
              {currentBusiness?.company_name.charAt(0) || 'B'}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {currentBusiness?.company_name || 'Select Business'}
            </div>
            {currentBusiness?.city && currentBusiness?.state && (
              <div className="text-xs text-white/60 truncate">
                {currentBusiness.city}, {currentBusiness.state}
              </div>
            )}
          </div>
        </div>

        <ChevronDown 
          className={`w-4 h-4 text-white/80 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute z-50 ${
          isMobile 
            ? 'left-0 right-0 mt-2' 
            : 'right-0 mt-2 w-80'
        } bg-white rounded-lg shadow-lg border border-gray-200 py-2 dark:bg-gray-800 dark:border-gray-600 max-h-64 overflow-y-auto`}>
          
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Switch Business
            </div>
          </div>

          {/* Business List */}
          <div className="py-1" role="listbox">
            {businesses.map((business) => {
              const isSelected = business.business_id === currentBusinessId
              
              return (
                <button
                  key={business.business_id}
                  onClick={() => handleBusinessSelect(business.business_id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 group transition-colors"
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {business.company_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {business.city && business.state 
                        ? `${business.city}, ${business.state}`
                        : `ID: ${business.business_id}`
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