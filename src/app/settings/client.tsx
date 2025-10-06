'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, Profile } from '@/types/auth'
import { ArrowLeft, User, Check, X, Users, Eye, EyeOff } from 'lucide-react'
import ProfileManagementClientNew from '@/app/(dashboard)/profile-management/client-new'
import { createClient } from '@/lib/supabase/client'

interface SettingsClientProps {
  user: AuthUser
}

interface ProfileFormData {
  full_name: string
  telegram_id: string
  ghl_id: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ProfileResponse {
  success: boolean
  data: {
    profile: Profile
    emailVerified: boolean
  }
  error?: string
}

interface UpdateResponse {
  success: boolean
  data: Profile
  message: string
  error?: string
}

/**
 * Settings page client component with unique layout
 * No global header - behaves like a completely new page
 */
export default function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'edit-profile' | 'profile-management'>('edit-profile')
  // Check if user is super admin (role 0) - handle null/undefined cases
  const isSuperAdmin = user?.profile?.role === 0

  // Debug: Log user data
  console.log('Settings - User:', user)
  console.log('Settings - Profile:', user?.profile)
  console.log('Settings - Role:', user?.profile?.role, 'Type:', typeof user?.profile?.role)
  console.log('Settings - isSuperAdmin:', isSuperAdmin)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [emailVerified, setEmailVerified] = useState<boolean>(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    telegram_id: '',
    ghl_id: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Password change state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ProfileResponse = await response.json()
      
      if (result.success && result.data) {
        setProfile(result.data.profile)
        setEmailVerified(result.data.emailVerified)
        setFormData({
          full_name: result.data.profile.full_name || '',
          telegram_id: result.data.profile.telegram_id || '',
          ghl_id: result.data.profile.ghl_id || ''
        })
      } else {
        throw new Error(result.error || 'Failed to fetch profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load profile'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name.trim()) {
      setMessage({
        type: 'error',
        text: 'Full name is required'
      })
      return
    }

    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          telegram_id: formData.telegram_id.trim() || null,
          ghl_id: formData.ghl_id.trim() || null
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: UpdateResponse = await response.json()
      
      if (result.success && result.data) {
        setProfile(result.data)
        setMessage({
          type: 'success',
          text: result.message || 'Profile updated successfully'
        })
      } else {
        throw new Error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReturnToDashboard = () => {
    router.push('/dashboard')
  }

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Current password is required'
      })
      return
    }

    if (!passwordData.newPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New password is required'
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be at least 6 characters'
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New passwords do not match'
      })
      return
    }

    try {
      setChangingPassword(true)
      setPasswordMessage(null)

      const supabase = createClient()

      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: passwordData.currentPassword
      })

      if (signInError) {
        setPasswordMessage({
          type: 'error',
          text: 'Current password is incorrect'
        })
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) {
        setPasswordMessage({
          type: 'error',
          text: updateError.message || 'Failed to update password'
        })
        return
      }

      // Success
      setPasswordMessage({
        type: 'success',
        text: 'Password updated successfully'
      })

      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordMessage({
        type: 'error',
        text: 'An unexpected error occurred'
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with return button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 h-16 flex items-center">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>

      <div className="py-8">
        <div className="flex gap-4">
          {/* Left Vertical Menu */}
          <div className="w-48 flex-shrink-0 ml-4">
            <nav className="bg-white rounded-lg shadow p-3">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                Account Settings
              </h2>
              <ul className="space-y-2">
                {/* Profile Management - Super Admin Only (Feature 3) */}
                {isSuperAdmin && (
                  <li>
                    <button
                      onClick={() => setActiveSection('profile-management')}
                      className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === 'profile-management'
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Profile Management</span>
                    </button>
                  </li>
                )}

                <li>
                  <button
                    onClick={() => setActiveSection('edit-profile')}
                    className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === 'edit-profile'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 mr-4">
            {activeSection === 'profile-management' && isSuperAdmin ? (
              <ProfileManagementClientNew />
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  {activeSection === 'edit-profile' && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-6">
                        Profile Information
                      </h3>

                    {message && (
                      <div className={`mb-4 p-4 rounded-md ${
                        message.type === 'success' 
                          ? 'bg-green-50 text-green-800' 
                          : 'bg-red-50 text-red-800'
                      }`}>
                        {message.text}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Email Field - Read-only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={profile?.email || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {emailVerified ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Email verification status: {emailVerified ? 'Verified' : 'Not verified'}
                        </p>
                      </div>

                      {/* Full Name Field */}
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter your full name"
                        />
                      </div>

                      {/* Telegram ID Field */}
                      <div>
                        <label htmlFor="telegram_id" className="block text-sm font-medium text-gray-700 mb-2">
                          Telegram ID
                        </label>
                        <input
                          type="text"
                          id="telegram_id"
                          name="telegram_id"
                          value={formData.telegram_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter your Telegram ID"
                        />
                      </div>

                      {/* GHL ID Field */}
                      <div>
                        <label htmlFor="ghl_id" className="block text-sm font-medium text-gray-700 mb-2">
                          GHL ID
                        </label>
                        <input
                          type="text"
                          id="ghl_id"
                          name="ghl_id"
                          value={formData.ghl_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter your GHL ID"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                        >
                          {saving && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          )}
                          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Divider */}
                    <div className="my-8 border-t border-gray-200"></div>

                    {/* Password Change Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-6">
                        Change Password
                      </h3>

                      {passwordMessage && (
                        <div className={`mb-4 p-4 rounded-md ${
                          passwordMessage.type === 'success'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {passwordMessage.text}
                        </div>
                      )}

                      <form onSubmit={handlePasswordSubmit} className="space-y-6">
                        {/* Current Password Field */}
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              id="currentPassword"
                              name="currentPassword"
                              required
                              value={passwordData.currentPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New Password Field */}
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              id="newPassword"
                              name="newPassword"
                              required
                              value={passwordData.newPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              id="confirmPassword"
                              name="confirmPassword"
                              required
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordInputChange}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Confirm your new password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                          >
                            {changingPassword && (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            <span>{changingPassword ? 'Changing Password...' : 'Change Password'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}