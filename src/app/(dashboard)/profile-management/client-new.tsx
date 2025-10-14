'use client'

import { useState, useEffect } from 'react'
import { Users, Search, ChevronDown, Edit, Trash, X, ArrowLeft, Plus, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { ComponentLoading } from '@/components/LoadingSystem'
import { authGet, authPost, authDelete, authPatch } from '@/lib/auth-fetch'
import { createClient } from '@/lib/supabase/client'

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

interface ProfileManagementData {
  users: User[]
  businesses: Business[]
}

interface NewUserForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  role: number
}

export default function ProfileManagementClientNew() {
  const [data, setData] = useState<ProfileManagementData | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit User Panel
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info')
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  // Password Reset State
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)


  // Create User Panel
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 1
  })

  // Business Assignment
  const [businessSearch, setBusinessSearch] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')

  // Dropdowns
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authGet('/api/admin/profile-management')

      if (response.success && response.data) {
        setData(response.data)

        // Update selectedUser with fresh data if a user is currently selected
        if (selectedUser) {
          const updatedUser = response.data.users.find((user: User) => user.id === selectedUser.id)
          if (updatedUser) {
            setSelectedUser(updatedUser)
          }
        }
      } else {
        throw new Error(response.error || 'Failed to load profile management data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async () => {
    try {
      setCreatingUser(true)
      setError(null)
      setSuccess(null)

      const supabase = createClient()

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: `${newUserForm.firstName} ${newUserForm.lastName}`.trim(),
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Update role if needed
        if (newUserForm.role !== 1) {
          await authPatch('/api/admin/users', {
            userId: authData.user.id,
            role: newUserForm.role
          })
        }

        setSuccess('User created successfully!')
        setShowCreatePanel(false)
        setNewUserForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          role: 1
        })
        await loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreatingUser(false)
    }
  }

  const assignBusiness = async (profileId: string, businessId: number) => {
    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      await authPost('/api/admin/profile-businesses', {
        profileId,
        businessId
      })

      setSuccess('Business successfully assigned')
      await loadData()
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

      await authDelete(
        `/api/admin/profile-businesses?profileId=${profileId}&businessId=${businessId}`
      )

      setSuccess('Business access removed')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove business')
    } finally {
      setIsUpdating(false)
    }
  }

  const isBusinessAssigned = (user: User, businessId: number): boolean => {
    return user.assigned_businesses.some(b => b.business_id === businessId)
  }

  const openEditPanel = (user: User) => {
    setSelectedUser(user)
    const [firstName, ...lastNameParts] = (user.full_name || '').split(' ')
    setEditUserForm({
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      email: user.email,
      phone: '' // Phone not in current User interface
    })
    setActiveTab('info')
    setShowEditPanel(true)
  }

  const closeEditPanel = () => {
    setShowEditPanel(false)
    setSelectedUser(null)
    setBusinessSearch('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowNewPassword(false)
    setShowConfirmNewPassword(false)
    setError(null)
    setSuccess(null)
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return

    // Validation
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      setTimeout(() => setError(null), 3000)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      setResettingPassword(true)
      setError(null)
      setSuccess(null)

      const response = await authPost('/api/admin/users/reset-password', {
        userId: selectedUser.id,
        newPassword
      })

      if (response.success) {
        setSuccess('Password reset successfully!')
        setNewPassword('')
        setConfirmNewPassword('')
        setShowNewPassword(false)
        setShowConfirmNewPassword(false)
        setTimeout(() => {
          setSuccess(null)
        }, 3000)
      } else {
        setError(response.error || 'Failed to reset password')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      setError('Failed to reset password')
      setTimeout(() => setError(null), 3000)
    } finally {
      setResettingPassword(false)
    }
  }

  const deleteUser = async () => {
    if (!userToDelete) return

    try {
      setIsDeleting(true)
      setError(null)
      setSuccess(null)

      const response = await authDelete(`/api/admin/users?userId=${userToDelete.id}`)

      if (response.success) {
        setSuccess(`User "${userToDelete.full_name || userToDelete.email}" deleted successfully`)
        setShowDeleteConfirm(false)
        setUserToDelete(null)
        await loadData()
      } else {
        throw new Error(response.error || 'Failed to delete user')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    setUserToDelete(null)
  }


  // Get unique companies for filter
  const companies = data?.businesses || []

  // Filter businesses for assignment
  const availableBusinesses = companies.filter(business =>
    business.company_name.toLowerCase().includes(businessSearch.toLowerCase())
  )

  // Get filtered users
  const filteredUsers = (data?.users || []).filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole =
      selectedRole === 'all' ||
      (selectedRole === 'admin' && user.role === 0) ||
      (selectedRole === 'user' && user.role === 1)

    const matchesCompany =
      selectedCompany === 'all' ||
      (user.role === 0) || // Super admins match all companies
      user.assigned_businesses.some(b => b.business_id.toString() === selectedCompany)

    return matchesSearch && matchesRole && matchesCompany
  })

  const getRoleBadge = (role: number) => {
    if (role === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">ACCOUNT-ADMIN</span>
    }
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">ACCOUNT-USER</span>
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <ComponentLoading message="Loading profile management..." />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-sm text-red-800">{error}</div>
        <button
          onClick={loadData}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Retry
        </button>
      </div>
    )
  }

  // Delete Confirmation Modal
  if (showDeleteConfirm && userToDelete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete <span className="font-semibold">{userToDelete.full_name || userToDelete.email}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The user will be permanently removed from the system and will lose access to all assigned businesses.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
            <button
              onClick={closeDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={deleteUser}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isDeleting ? 'Deleting...' : 'Delete User'}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Create User Panel
  if (showCreatePanel) {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Edit or manage your team</h3>
            <button
              onClick={() => setShowCreatePanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Main content */}
          <div className="max-w-4xl mx-auto">
              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Password (min. 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Regular User</option>
                    <option value={0}>Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreatePanel(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createUser}
                  disabled={creatingUser || !newUserForm.firstName || !newUserForm.email || !newUserForm.password}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingUser && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{creatingUser ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </div>
        </div>
      </div>
    )
  }

  // Edit User Panel with Tabs
  if (showEditPanel && selectedUser) {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={closeEditPanel}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-medium text-gray-900">
                Edit User: {selectedUser.full_name || selectedUser.email}
              </h3>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6 -mb-px">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Edit Info
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assign Permissions
            </button>
          </nav>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-sm text-green-800">{success}</div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {/* Edit Info Tab */}
          {activeTab === 'info' && (
            <div className="max-w-4xl mx-auto">
              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editUserForm.firstName}
                      onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editUserForm.lastName}
                      onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone"
                    />
                  </div>
                </div>

                {/* Password Reset Section - Only for Regular Users */}
                {selectedUser && selectedUser.role !== 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Reset User Password</h4>
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start space-x-3">
                        <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-700">
                            As a super admin, you can reset this user's password without knowing their current password.
                            The user will be able to log in immediately with the new password.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* New Password Field */}
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter new password (min. 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password Field */}
                      <div>
                        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            id="confirmNewPassword"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Reset Password Button */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleResetPassword}
                          disabled={resettingPassword || !newPassword || !confirmNewPassword}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {resettingPassword && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          )}
                          <span>{resettingPassword ? 'Resetting...' : 'Reset Password'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={closeEditPanel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setIsUpdating(true)
                        const response = await authPatch('/api/admin/users', {
                          userId: selectedUser.id,
                          firstName: editUserForm.firstName,
                          lastName: editUserForm.lastName,
                          email: editUserForm.email,
                          phone: editUserForm.phone
                        })

                        if (response.success) {
                          setSuccess('User updated successfully')
                          setTimeout(() => {
                            setSuccess(null)
                            closeEditPanel()
                            loadData()
                          }, 2000)
                        } else {
                          setError(response.error || 'Failed to update user')
                          setTimeout(() => setError(null), 3000)
                        }
                      } catch (err) {
                        setError('Failed to update user')
                        setTimeout(() => setError(null), 3000)
                      } finally {
                        setIsUpdating(false)
                      }
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assign Permissions Tab */}
          {activeTab === 'permissions' && (
            <div>
          {selectedUser.role === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Super Admin User</h3>
              <p className="mt-1 text-sm text-gray-500">
                This user has access to all businesses automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search for businesses to add */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Business Access
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search businesses to add..."
                    value={businessSearch}
                    onChange={(e) => setBusinessSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Search Results */}
                {businessSearch && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {availableBusinesses
                      .filter(b => !isBusinessAssigned(selectedUser, b.business_id))
                      .map((business) => (
                        <button
                          key={business.business_id}
                          onClick={() => {
                            assignBusiness(selectedUser.id, business.business_id)
                            setBusinessSearch('')
                          }}
                          disabled={isUpdating}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-3">
                            {business.avatar_url ? (
                              <img
                                src={business.avatar_url}
                                alt={business.company_name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                <Users className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <span className="text-sm text-gray-900">{business.company_name}</span>
                          </div>
                          <Plus className="w-4 h-4 text-blue-600" />
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Assigned Businesses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Businesses ({selectedUser.assigned_businesses.length})
                </label>
                <div className="space-y-2">
                  {selectedUser.assigned_businesses.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No businesses assigned yet.
                    </div>
                  ) : (
                    selectedUser.assigned_businesses.map((business) => (
                      <div
                        key={business.business_id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {business.avatar_url ? (
                            <img
                              src={business.avatar_url}
                              alt={business.company_name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{business.company_name}</span>
                        </div>
                        <button
                          onClick={() => removeBusiness(selectedUser.id, business.business_id)}
                          disabled={isUpdating}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main User List
  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="text-sm text-green-800">{success}</div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Company Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setCompanyDropdownOpen(!companyDropdownOpen)
                setRoleDropdownOpen(false)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>
                {selectedCompany === 'all'
                  ? 'Company'
                  : companies.find(c => c.business_id.toString() === selectedCompany)?.company_name || 'Company'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {companyDropdownOpen && (
              <div className="absolute z-10 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedCompany('all')
                      setCompanyDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Companies
                  </button>
                  {companies.map(company => (
                    <button
                      key={company.business_id}
                      onClick={() => {
                        setSelectedCompany(company.business_id.toString())
                        setCompanyDropdownOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {company.company_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Role Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen)
                setCompanyDropdownOpen(false)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>
                {selectedRole === 'all' ? 'User Role' : selectedRole === 'admin' ? 'Admin' : 'User'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedRole('all')
                      setRoleDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRole('admin')
                      setRoleDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRole('user')
                      setRoleDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    User
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="name, email, phone, ids"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Add User Button */}
        <button
          onClick={() => setShowCreatePanel(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'No name'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">-</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPanel(user)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(user)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete user"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
