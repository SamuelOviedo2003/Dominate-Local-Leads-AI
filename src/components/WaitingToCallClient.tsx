'use client'

import { useState, useEffect } from 'react'
import { WaitingToCallLead } from '@/types/leads'
import { WaitingToCallTable } from '@/components/features/leads/WaitingToCallTable'
import { useAuthData } from '@/contexts/AuthDataContext'

export function WaitingToCallClient() {
  const { user } = useAuthData()
  const [leads, setLeads] = useState<WaitingToCallLead[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWaitingToCallLeads = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/leads/waiting-to-call', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch waiting to call leads')
        }

        const result = await response.json()
        setLeads(result.data || [])
      } catch (err) {
        console.error('Error fetching waiting to call leads:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch when user is available (AuthDataProvider ensures user exists)
    if (user) {
      fetchWaitingToCallLeads()
    } else {
      setError('User not authenticated')
      setIsLoading(false)
    }
  }, [user])

  // Show loading state while data is loading
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Waiting to Call</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiting to Call</h1>
            <p className="mt-1 text-sm text-gray-500">
              Leads marked for calling across all your accessible businesses
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">
                {error}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Waiting to Call Table */}
        <WaitingToCallTable
          leads={leads}
          isLoading={isLoading}
          error={error}
          title="All Waiting to Call Leads"
        />
      </div>
    </div>
  )
}
