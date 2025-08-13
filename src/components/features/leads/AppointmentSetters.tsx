'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { AppointmentSetter } from '@/types/leads'

interface AppointmentSettersProps {
  setters: AppointmentSetter[] | null
  isLoading: boolean
  error: string | null
}

export function AppointmentSetters({ setters, isLoading, error }: AppointmentSettersProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3

  const handlePrevious = () => {
    if (setters && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (setters && currentIndex < setters.length - itemsPerPage) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Setters</h3>
        <div className="text-red-500 text-sm">Error loading setters: {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Appointment Setters</h3>
        {setters && setters.length > itemsPerPage && (
          <div className="flex flex-col space-y-1">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= (setters?.length || 0) - itemsPerPage}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : setters && setters.length > 0 ? (
        <div className="space-y-4 min-h-[300px]">
          {setters.slice(currentIndex, currentIndex + itemsPerPage).map((setter, index) => (
            <div key={setter.name} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="font-semibold text-gray-900 mb-3">{setter.name}</div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Leads</div>
                  <div className="font-semibold">{setter.totalLeads}</div>
                </div>
                <div>
                  <div className="text-gray-600">Contacted</div>
                  <div className="font-semibold text-blue-600">
                    {setter.contacted} ({setter.contactRate.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Booked</div>
                  <div className="font-semibold text-green-600">
                    {setter.booked} ({setter.bookingRate.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Call Time</div>
                  <div className="font-semibold">{formatTime(setter.totalCallTime)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-600">Avg Response Speed</div>
                  <div className="font-semibold">{setter.avgResponseSpeed.toFixed(1)}s</div>
                </div>
              </div>
            </div>
          ))}
          
          {setters.length > itemsPerPage && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Showing {currentIndex + 1}-{Math.min(currentIndex + itemsPerPage, setters.length)} of {setters.length}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">No appointment setters found</div>
      )}
    </div>
  )
}