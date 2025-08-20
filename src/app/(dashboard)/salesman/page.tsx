'use client'

import { useState, useEffect } from 'react'
import { useEffectiveBusinessId } from '@/contexts/CompanyContext'
import { TimePeriodFilter } from '@/components/features/leads/TimePeriodFilter'
import { LeadsTable } from '@/components/features/leads/LeadsTable'
import { TrendingUp, Users, DollarSign, Target, Award, BarChart3 } from 'lucide-react'
import { ComponentLoading, CardSkeleton } from '@/components/LoadingSystem'
import { 
  SalesmanMetrics, 
  SalesmanPerformance, 
  RevenueTrendData, 
  TimePeriod,
  LeadWithClient,
  ApiResponse
} from '@/types/leads'

export const dynamic = 'force-dynamic'

export default function SalesmanPage() {
  const businessId = useEffectiveBusinessId()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30')
  const [metrics, setMetrics] = useState<SalesmanMetrics | null>(null)
  const [salesmanLeads, setSalesmanLeads] = useState<LeadWithClient[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leadsError, setLeadsError] = useState<string | null>(null)

  // Calculate start date based on selected period
  const getStartDate = (period: TimePeriod) => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString()
  }

  // Fetch all salesman data
  const fetchSalesmanData = async (period: TimePeriod) => {
    if (!businessId) return

    setLoading(true)
    setError(null)

    try {
      const startDate = getStartDate(period)
      const baseUrl = `/api/salesman`
      const params = new URLSearchParams({
        startDate,
        businessId: businessId.toString(),
        timePeriod: period
      })

      // Fetch metrics data
      const metricsRes = await fetch(`${baseUrl}/metrics?${params}`)
      
      if (!metricsRes.ok) {
        throw new Error('Failed to fetch salesman data')
      }

      const metricsData = await metricsRes.json()

      if (!metricsData.success) {
        throw new Error('API returned error')
      }

      setMetrics(metricsData.data)
    } catch (err) {
      console.error('Error fetching salesman data:', err)
      setError('Failed to load salesman data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch salesman leads data (stage = 2)
  const fetchSalesmanLeads = async (period: TimePeriod) => {
    if (!businessId) return

    setLeadsLoading(true)
    setLeadsError(null)

    try {
      const startDate = getStartDate(period)
      const params = new URLSearchParams({
        startDate,
        businessId: businessId.toString()
      })

      const response = await fetch(`/api/salesman/leads?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch salesman leads')
      }

      const result: ApiResponse<LeadWithClient[]> = await response.json()
      
      if (!result.success) {
        throw new Error('API returned error')
      }

      setSalesmanLeads(result.data)
    } catch (err) {
      console.error('Error fetching salesman leads:', err)
      setLeadsError('Failed to load salesman leads. Please try again.')
    } finally {
      setLeadsLoading(false)
    }
  }

  // Effect to fetch data when component mounts or period changes
  useEffect(() => {
    fetchSalesmanData(selectedPeriod)
    fetchSalesmanLeads(selectedPeriod)
  }, [businessId, selectedPeriod])

  // Handle period change
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <ComponentLoading message="Loading salesman dashboard..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => fetchSalesmanData(selectedPeriod)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salesman Dashboard</h1>
          <p className="text-gray-600 mt-2">Track sales performance and revenue metrics</p>
        </div>
        <TimePeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {/* Revenue Metrics Cards */}
      <div className="mb-8">
        {loading ? (
          <CardSkeleton count={5} />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm">
              Error loading metrics: {error}
            </div>
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Shows</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.shows}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <Award className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Closes</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.closes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Close Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.closeRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${metrics.averageOrderValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="text-gray-500 text-center">No metrics data available</div>
          </div>
        )}
      </div>

      {/* Salesman Leads Table */}
      <LeadsTable 
        leads={salesmanLeads}
        isLoading={leadsLoading}
        error={leadsError}
        navigationTarget="property-details"
      />
    </div>
  )
}