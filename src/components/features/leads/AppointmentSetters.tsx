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
      <div className="bg-white rounded-lg shadow-sm border p-6 h-[500px] flex flex-col">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center flex-shrink-0">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          Appointment Setters
        </h3>
        <div className="text-red-500 text-center flex-1 flex items-center justify-center">
          Error loading setters: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col h-[500px] overflow-visible">
      {/* Fixed Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          Appointment Setters
        </h3>
        {setters && setters.length > 3 && (
          <div className="flex flex-col space-y-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-gray-50 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200 hover:border-purple-300"
              aria-label="Previous appointment setters"
            >
              <ChevronUp className="h-5 w-5 text-purple-600" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= Math.max(0, (setters?.length || 0) - itemsPerPage)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200 hover:border-purple-300"
              aria-label="Next appointment setters"
            >
              <ChevronDown className="h-5 w-5 text-purple-600" />
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
        </div>
      ) : setters && setters.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-visible"
            style={{ paddingLeft: '4px', paddingRight: '4px' }}
          >
            <div className="space-y-6 py-2">
            {/* Show all items if 3 or fewer, otherwise use pagination */}
            {(setters.length <= 3 ? setters : setters.slice(currentIndex, currentIndex + itemsPerPage)).map((setter, index) => (
            <div 
              key={setter.name} 
              className="group bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all duration-300 transform hover:scale-[1.02] origin-center"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-3 shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors truncate">
                  {setter.name}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Leads</div>
                    <div className="text-xl font-bold text-gray-900">{setter.totalLeads}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacted</div>
                    <div className="flex items-baseline space-x-2">
                      <div className="text-xl font-bold text-gray-900">{setter.contacted}</div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {setter.contactRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Booked</div>
                    <div className="flex items-baseline space-x-2">
                      <div className="text-xl font-bold text-gray-900">{setter.booked}</div>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        {setter.bookingRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Call Time</div>
                    <div className="text-xl font-bold text-gray-900">{formatTime(setter.totalCallTime)}</div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Response Speed</div>
                    <div className="text-lg font-bold text-purple-600">{setter.avgResponseSpeed.toFixed(1)}s</div>
                  </div>
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
        <div className="text-gray-500 text-center bg-gray-50 rounded-lg flex-1 flex flex-col justify-center p-8">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-700 mb-2">No appointment setters found</div>
          <div className="text-sm text-gray-500">Check back later for updates</div>
        </div>
      )}
    </div>
  )
}

export const AppointmentSetters = memo(AppointmentSettersComponent)