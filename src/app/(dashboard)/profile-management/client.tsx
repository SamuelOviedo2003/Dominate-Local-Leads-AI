'use client'

import { useState, useEffect } from 'react'
import { Users, Building, Plus, Minus, Eye, AlertCircle } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'

interface User {
  id: string
  email: string
  full_name: string
  role: number
  business_id: number
  created_at: string
  updated_at: string
  assigned_businesses: {
    business_id: number
    company_name: string
    avatar_url: string | null
  }[]
}

interface Business {
  business_id: number
  company_name: string
  avatar_url: string | null
  city: string | null
  state: string | null
  dashboard: boolean
}

export default function ProfileManagementClient() {
  const [users, setUsers] = useState<User[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch users and businesses in parallel
      const [usersResponse, businessesResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/businesses')
      ])

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users')
      }

      if (!businessesResponse.ok) {
        throw new Error('Failed to fetch businesses')
      }

      const usersData = await usersResponse.json()
      const businessesData = await businessesResponse.json()

      const newUsers = usersData.data || []
      setUsers(newUsers)
      setBusinesses(businessesData.data || [])

      // Update selectedUser with fresh data if a user is currently selected
      if (selectedUser) {
        const updatedUser = newUsers.find((user: User) => user.id === selectedUser.id)
        if (updatedUser) {
          setSelectedUser(updatedUser)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const assignBusiness = async (profileId: string, businessId: number) => {
    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/profile-businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId,
          businessId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign business')
      }

      setSuccess('Business successfully assigned to user')
      await loadData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign business')
    } finally {
      setIsUpdating(false)
    }
  }

  const removeBusiness = async (profileId: string, businessId: number) => {
    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(
        `/api/admin/profile-businesses?profileId=${profileId}&businessId=${businessId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove business access')
      }

      setSuccess('Business access successfully removed from user')
      await loadData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove business access')
    } finally {
      setIsUpdating(false)
    }
  }

  const isBusinessAssigned = (user: User, businessId: number): boolean => {
    return user.assigned_businesses.some(b => b.business_id === businessId)
  }

  const getUserBusinessIds = (user: User): Set<number> => {
    return new Set(user.assigned_businesses.map(b => b.business_id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading profile management data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Users Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className={`px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 0 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 0 ? 'Super Admin' : 'Regular User'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {user.role === 0 ? 'All Businesses' : `${user.assigned_businesses.length} assigned`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Assignment Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Building className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                {selectedUser ? `Business Access for ${selectedUser.full_name || selectedUser.email}` : 'Select a User'}
              </h3>
            </div>
          </div>
          
          {!selectedUser ? (
            <div className="px-6 py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No user selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a user from the left panel to manage their business access.
              </p>
            </div>
          ) : selectedUser.role === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Super Admin User</h3>
              <p className="mt-1 text-sm text-gray-500">
                Super admins have access to all businesses automatically. Business assignments cannot be modified.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {businesses.map((business) => {
                const isAssigned = isBusinessAssigned(selectedUser, business.business_id)
                return (
                  <div key={business.business_id} className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {business.avatar_url ? (
                          <img
                            src={business.avatar_url}
                            alt={business.company_name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Building className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {business.company_name}
                          </p>
                          {business.city && business.state && (
                            <p className="text-sm text-gray-500">
                              {business.city}, {business.state}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isAssigned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Assigned
                          </span>
                        )}
                        
                        <button
                          onClick={() => {
                            if (isAssigned) {
                              removeBusiness(selectedUser.id, business.business_id)
                            } else {
                              assignBusiness(selectedUser.id, business.business_id)
                            }
                          }}
                          disabled={isUpdating}
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded transition-colors ${
                            isAssigned
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50'
                          }`}
                        >
                          {isUpdating ? (
                            <LoadingSpinner size="sm" />
                          ) : isAssigned ? (
                            <>
                              <Minus className="w-3 h-3 mr-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Assign
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}