'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, Profile } from '@/types/auth'
import { ArrowLeft, User, Check, X } from 'lucide-react'

interface SettingsClientProps {
  user: AuthUser
}

interface ProfileFormData {
  full_name: string
  telegram_id: string
  ghl_id: string
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
  const [activeSection, setActiveSection] = useState<'edit-profile'>('edit-profile')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with return button */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={handleReturnToDashboard}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Return to Dashboard</span>
            </button>
            
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Settings
            </h1>
            
            <div className="w-32" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Vertical Menu */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Account Settings
              </h2>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setActiveSection('edit-profile')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === 'edit-profile'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6">
                {activeSection === 'edit-profile' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                      Profile Information
                    </h3>

                    {message && (
                      <div className={`mb-4 p-4 rounded-md ${
                        message.type === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}>
                        {message.text}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Email Field - Read-only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={profile?.email || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {emailVerified ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Email verification status: {emailVerified ? 'Verified' : 'Not verified'}
                        </p>
                      </div>

                      {/* Full Name Field */}
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          required
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter your full name"
                        />
                      </div>

                      {/* Telegram ID Field */}
                      <div>
                        <label htmlFor="telegram_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Telegram ID
                        </label>
                        <input
                          type="text"
                          id="telegram_id"
                          name="telegram_id"
                          value={formData.telegram_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter your Telegram ID"
                        />
                      </div>

                      {/* GHL ID Field */}
                      <div>
                        <label htmlFor="ghl_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          GHL ID
                        </label>
                        <input
                          type="text"
                          id="ghl_id"
                          name="ghl_id"
                          value={formData.ghl_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}