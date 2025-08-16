'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { ChevronUp, ChevronDown, User, Clock, Phone, CheckCircle } from 'lucide-react'
import { AppointmentSetter } from '@/types/leads'

interface AppointmentSettersProps {
  setters: AppointmentSetter[] | null
  isLoading: boolean
  error: string | null
}

function AppointmentSettersComponent({ setters, isLoading, error }: AppointmentSettersProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 2 // Show 2 items at a time for optimal space usage in compact layout

  const scrollToIndex = useCallback((index: number) => {
    if (scrollContainerRef.current && setters) {
      const container = scrollContainerRef.current
      const visibleItems = Math.min(setters.length, itemsPerPage)
      const itemHeight = container.scrollHeight / Math.max(visibleItems, 1)
      const scrollTop = index * itemHeight
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }, [setters, itemsPerPage])

  const handlePrevious = useCallback(() => {
    if (setters && currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      scrollToIndex(newIndex)
    }
  }, [setters, currentIndex, scrollToIndex])

  const handleNext = useCallback(() => {
    if (setters && currentIndex < setters.length - itemsPerPage) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      scrollToIndex(newIndex)
    }
  }, [setters, currentIndex, itemsPerPage, scrollToIndex])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }, [])

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 h-[420px] flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center flex-shrink-0">
          <User className="w-5 h-5 mr-3 text-purple-500" />
          Appointment Setters
        </h3>
        <div className="text-red-500 text-sm flex-1 flex items-center justify-center">Error loading setters: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 flex flex-col h-[420px]">
      {/* Fixed Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <User className="w-5 h-5 mr-3 text-purple-500" />
          Appointment Setters
        </h3>
        {setters && setters.length > 3 && (
          <div className="flex flex-col space-y-1">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-purple-200 hover:border-purple-300"
              aria-label="Previous appointment setters"
            >
              <ChevronUp className="h-4 w-4 text-purple-600" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= Math.max(0, (setters?.length || 0) - itemsPerPage)}
              className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-purple-200 hover:border-purple-300"
              aria-label="Next appointment setters"
            >
              <ChevronDown className="h-4 w-4 text-purple-600" />
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {[...Array(itemsPerPage)].map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : setters && setters.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <div className="space-y-2">
            {/* Show all items if 3 or fewer, otherwise use pagination */}
            {(setters.length <= 3 ? setters : setters.slice(currentIndex, currentIndex + itemsPerPage)).map((setter, index) => (
            <div 
              key={setter.name} 
              className="group border border-gray-200 rounded-lg p-2 sm:p-3 hover:border-purple-300 hover:bg-gradient-to-r from-purple-50 to-blue-50 transition-all duration-300 transform hover:scale-[1.01]"
            >
              <div className="flex items-center mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-purple-700 transition-colors truncate">
                  {setter.name}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-600 font-medium">Total Leads</div>
                    <div className="font-bold text-gray-900">{setter.totalLeads}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Phone className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-600 font-medium">Contacted</div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1">
                      <div className="font-bold text-blue-600">{setter.contacted}</div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
                        {setter.contactRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-600 font-medium">Booked</div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-1">
                      <div className="font-bold text-green-600">{setter.booked}</div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full w-fit">
                        {setter.bookingRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-600 font-medium">Call Time</div>
                    <div className="font-bold text-orange-600">{formatTime(setter.totalCallTime)}</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-center">
                <div className="text-center">
                      <div className="text-xs text-gray-600 font-medium">Avg Response Speed</div>
                      <div className="font-bold text-purple-600 text-sm">{setter.avgResponseSpeed.toFixed(1)}s</div>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
          
          {setters.length > 3 && (
            <div className="text-center text-sm text-gray-500 mt-2 py-1 bg-gray-50 rounded-lg flex-shrink-0">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <div>
                  Showing {currentIndex + 1}-{Math.min(currentIndex + itemsPerPage, setters.length)} of {setters.length}
                </div>
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-center bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg flex-1 flex flex-col justify-center">
          <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <div className="text-lg font-medium">No appointment setters found</div>
          <div className="text-sm mt-1">Check back later for updates</div>
        </div>
      )}
    </div>
  )
}

export const AppointmentSetters = memo(AppointmentSettersComponent)