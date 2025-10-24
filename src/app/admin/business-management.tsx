'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Search, ChevronDown, ChevronUp, Edit, X, ArrowLeft, Plus, Upload, Image as ImageIcon } from 'lucide-react'
import { ComponentLoading } from '@/components/LoadingSystem'
import { authGet, authPost, authPatch } from '@/lib/auth-fetch'
import { createClient } from '@/lib/supabase/client'

interface Business {
  business_id: number
  company_name: string
  phone: string | null
  api_key: string | null
  location_id: string | null
  calendar_id: string | null
  time_zone: string | null
  ai_name: string | null
  street_name: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  opening_hours: string | null
  operating_in: string | null
  company_type: string | null
  knowledge_base: string | null
  created_at: string
  modified_at: string
  retell_phone: string | null
  owners: string | null
  callers_intent: string | null
  intent_actions: string | null
  avatar_url: string | null
  dashboard: boolean | null
  area_codes: string | null
  fb_account_id: string | null
  sms_webhook: string | null
  pixel_lead_webhook: string | null
  pixel_calendar_webhook: string | null
  custom_fields_webhook: string | null
  customer_cid: string | null
  permalink: string | null
  dialpad_phone: string | null
  va_saturday: boolean | null
  va_sunday: boolean | null
  dialpad_department_id: bigint | null
}

interface BusinessFormData {
  company_name: string
  phone: string
  city: string
  state: string
  company_type: string
  // Optional attributes
  street_name: string
  postal_code: string
  time_zone: string
  ai_name: string
  api_key: string
  location_id: string
  calendar_id: string
  retell_phone: string
  dialpad_phone: string
  owners: string
  opening_hours: string
  operating_in: string
  knowledge_base: string
  callers_intent: string
  intent_actions: string
  area_codes: string
  fb_account_id: string
  sms_webhook: string
  pixel_lead_webhook: string
  pixel_calendar_webhook: string
  custom_fields_webhook: string
  customer_cid: string
  permalink: string
  va_saturday: boolean
  va_sunday: boolean
  dialpad_department_id: string
}

export default function BusinessManagement() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit Business Panel
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [editBusinessForm, setEditBusinessForm] = useState<BusinessFormData>({
    company_name: '',
    phone: '',
    city: '',
    state: '',
    company_type: '',
    street_name: '',
    postal_code: '',
    time_zone: '',
    ai_name: '',
    api_key: '',
    location_id: '',
    calendar_id: '',
    retell_phone: '',
    dialpad_phone: '',
    owners: '',
    opening_hours: '',
    operating_in: '',
    knowledge_base: '',
    callers_intent: '',
    intent_actions: '',
    area_codes: '',
    fb_account_id: '',
    sms_webhook: '',
    pixel_lead_webhook: '',
    pixel_calendar_webhook: '',
    custom_fields_webhook: '',
    customer_cid: '',
    permalink: '',
    va_saturday: false,
    va_sunday: false,
    dialpad_department_id: ''
  })

  // Create Business Panel
  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [creatingBusiness, setCreatingBusiness] = useState(false)
  const [newBusinessForm, setNewBusinessForm] = useState<BusinessFormData>({
    company_name: '',
    phone: '',
    city: '',
    state: '',
    company_type: '',
    street_name: '',
    postal_code: '',
    time_zone: '',
    ai_name: '',
    api_key: '',
    location_id: '',
    calendar_id: '',
    retell_phone: '',
    dialpad_phone: '',
    owners: '',
    opening_hours: '',
    operating_in: '',
    knowledge_base: '',
    callers_intent: '',
    intent_actions: '',
    area_codes: '',
    fb_account_id: '',
    sms_webhook: '',
    pixel_lead_webhook: '',
    pixel_calendar_webhook: '',
    custom_fields_webhook: '',
    customer_cid: '',
    permalink: '',
    va_saturday: false,
    va_sunday: false,
    dialpad_department_id: ''
  })

  // Optional attributes toggle
  const [showOptionalCreate, setShowOptionalCreate] = useState(false)
  const [showOptionalEdit, setShowOptionalEdit] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Dropdowns
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  // State for updating
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [success, error])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authGet('/api/admin/businesses')

      if (response.success && response.data) {
        setBusinesses(response.data)

        // Update selectedBusiness with fresh data if a business is currently selected
        if (selectedBusiness) {
          const updatedBusiness = response.data.find((b: Business) => b.business_id === selectedBusiness.business_id)
          if (updatedBusiness) {
            setSelectedBusiness(updatedBusiness)
          }
        }
      } else {
        throw new Error(response.error || 'Failed to load businesses')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const createBusiness = async () => {
    try {
      setCreatingBusiness(true)
      setError(null)
      setSuccess(null)

      const response = await authPost('/api/admin/businesses', newBusinessForm)

      if (response.success) {
        setSuccess('Business created successfully!')
        setShowCreatePanel(false)
        setNewBusinessForm({
          company_name: '',
          phone: '',
          city: '',
          state: '',
          company_type: '',
          street_name: '',
          postal_code: '',
          time_zone: '',
          ai_name: '',
          api_key: '',
          location_id: '',
          calendar_id: '',
          retell_phone: '',
          dialpad_phone: '',
          owners: '',
          opening_hours: '',
          operating_in: '',
          knowledge_base: '',
          callers_intent: '',
          intent_actions: '',
          area_codes: '',
          fb_account_id: '',
          sms_webhook: '',
          pixel_lead_webhook: '',
          pixel_calendar_webhook: '',
          custom_fields_webhook: '',
          customer_cid: '',
          permalink: '',
          va_saturday: false,
          va_sunday: false,
          dialpad_department_id: ''
        })
        setShowOptionalCreate(false)
        await loadData()
      } else {
        throw new Error(response.error || 'Failed to create business')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setCreatingBusiness(false)
    }
  }

  const updateBusiness = async () => {
    if (!selectedBusiness) return

    try {
      setIsUpdating(true)
      setError(null)
      setSuccess(null)

      const response = await authPatch('/api/admin/businesses', {
        businessId: selectedBusiness.business_id,
        ...editBusinessForm
      })

      if (response.success) {
        setSuccess('Business updated successfully')
        setTimeout(() => {
          setSuccess(null)
          closeEditPanel()
          loadData()
        }, 2000)
      } else {
        throw new Error(response.error || 'Failed to update business')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business')
    } finally {
      setIsUpdating(false)
    }
  }

  const openEditPanel = (business: Business) => {
    setSelectedBusiness(business)
    setEditBusinessForm({
      company_name: business.company_name || '',
      phone: business.phone || '',
      city: business.city || '',
      state: business.state || '',
      company_type: business.company_type || '',
      street_name: business.street_name || '',
      postal_code: business.postal_code || '',
      time_zone: business.time_zone || '',
      ai_name: business.ai_name || '',
      api_key: business.api_key || '',
      location_id: business.location_id || '',
      calendar_id: business.calendar_id || '',
      retell_phone: business.retell_phone || '',
      dialpad_phone: business.dialpad_phone || '',
      owners: business.owners || '',
      opening_hours: business.opening_hours || '',
      operating_in: business.operating_in || '',
      knowledge_base: business.knowledge_base || '',
      callers_intent: business.callers_intent || '',
      intent_actions: business.intent_actions || '',
      area_codes: business.area_codes || '',
      fb_account_id: business.fb_account_id || '',
      sms_webhook: business.sms_webhook || '',
      pixel_lead_webhook: business.pixel_lead_webhook || '',
      pixel_calendar_webhook: business.pixel_calendar_webhook || '',
      custom_fields_webhook: business.custom_fields_webhook || '',
      customer_cid: business.customer_cid || '',
      permalink: business.permalink || '',
      va_saturday: business.va_saturday || false,
      va_sunday: business.va_sunday || false,
      dialpad_department_id: business.dialpad_department_id?.toString() || ''
    })
    setShowOptionalEdit(false)
    setShowEditPanel(true)
  }

  const closeEditPanel = () => {
    setShowEditPanel(false)
    setSelectedBusiness(null)
    setShowOptionalEdit(false)
    setError(null)
    setSuccess(null)
    setSelectedFile(null)
    setImagePreview(null)
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size exceeds 5MB limit')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle image upload
  const handleUploadImage = async () => {
    if (!selectedFile || !selectedBusiness) return

    try {
      setUploadingImage(true)
      setError(null)

      // Get JWT token from Supabase session
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('Authentication failed - please refresh and try again')
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('businessId', selectedBusiness.business_id.toString())
      formData.append('permalink', selectedBusiness.permalink || '')

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setSuccess('Business logo updated successfully')
      setSelectedFile(null)
      setImagePreview(null)

      // Update the selected business with new avatar URL
      setSelectedBusiness({
        ...selectedBusiness,
        avatar_url: data.avatarUrl
      })

      // Reload data to refresh the list
      setTimeout(() => {
        setSuccess(null)
        loadData()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Trigger file input click
  const handleSelectImageClick = () => {
    fileInputRef.current?.click()
  }

  // Get unique states and types for filters
  const states = Array.from(new Set(businesses.map(b => b.state).filter(Boolean))) as string[]
  const types = Array.from(new Set(businesses.map(b => b.company_type).filter(Boolean))) as string[]

  // Get filtered businesses
  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch =
      business.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.phone?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesState =
      selectedState === 'all' || business.state === selectedState

    const matchesType =
      selectedType === 'all' || business.company_type === selectedType

    return matchesSearch && matchesState && matchesType
  })

  if (isLoading) {
    return (
      <div className="py-12">
        <ComponentLoading message="Loading businesses..." />
      </div>
    )
  }

  if (error && businesses.length === 0) {
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

  // Create Business Panel
  if (showCreatePanel) {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Create New Business</h3>
            <button
              onClick={() => {
                setShowCreatePanel(false)
                setShowOptionalCreate(false)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Required Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBusinessForm.company_name}
                  onChange={(e) => setNewBusinessForm({ ...newBusinessForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newBusinessForm.phone}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                  <input
                    type="text"
                    value={newBusinessForm.company_type}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, company_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Roofing, HVAC, Plumbing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newBusinessForm.city}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={newBusinessForm.state}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>

            {/* Optional Attributes Toggle */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowOptionalCreate(!showOptionalCreate)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showOptionalCreate ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>Show optional attributes</span>
              </button>
            </div>

            {/* Optional Fields */}
            {showOptionalCreate && (
              <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                    <input
                      type="text"
                      value={newBusinessForm.street_name}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, street_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Street Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={newBusinessForm.postal_code}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Postal Code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                    <input
                      type="text"
                      value={newBusinessForm.time_zone}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, time_zone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. America/New_York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Name</label>
                    <input
                      type="text"
                      value={newBusinessForm.ai_name}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, ai_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="AI Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <input
                      type="text"
                      value={newBusinessForm.api_key}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, api_key: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="API Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                    <input
                      type="text"
                      value={newBusinessForm.location_id}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Location ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calendar ID</label>
                    <input
                      type="text"
                      value={newBusinessForm.calendar_id}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, calendar_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Calendar ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dialpad Department ID</label>
                    <input
                      type="text"
                      value={newBusinessForm.dialpad_department_id}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, dialpad_department_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dialpad Department ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retell Phone</label>
                    <input
                      type="text"
                      value={newBusinessForm.retell_phone}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, retell_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Retell Phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dialpad Phone</label>
                    <input
                      type="text"
                      value={newBusinessForm.dialpad_phone}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, dialpad_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dialpad Phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owners</label>
                  <input
                    type="text"
                    value={newBusinessForm.owners}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, owners: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Owners"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                    <input
                      type="text"
                      value={newBusinessForm.opening_hours}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, opening_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Mon-Fri 9AM-5PM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operating In</label>
                    <input
                      type="text"
                      value={newBusinessForm.operating_in}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, operating_in: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Operating In"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge Base</label>
                  <textarea
                    value={newBusinessForm.knowledge_base}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, knowledge_base: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Knowledge Base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Callers Intent</label>
                  <textarea
                    value={newBusinessForm.callers_intent}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, callers_intent: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Callers Intent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intent Actions</label>
                  <textarea
                    value={newBusinessForm.intent_actions}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, intent_actions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Intent Actions"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Codes</label>
                    <input
                      type="text"
                      value={newBusinessForm.area_codes}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, area_codes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Area Codes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FB Account ID</label>
                    <input
                      type="text"
                      value={newBusinessForm.fb_account_id}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, fb_account_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="FB Account ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Webhook</label>
                  <input
                    type="text"
                    value={newBusinessForm.sms_webhook}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, sms_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SMS Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Lead Webhook</label>
                  <input
                    type="text"
                    value={newBusinessForm.pixel_lead_webhook}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, pixel_lead_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pixel Lead Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Calendar Webhook</label>
                  <input
                    type="text"
                    value={newBusinessForm.pixel_calendar_webhook}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, pixel_calendar_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pixel Calendar Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields Webhook</label>
                  <input
                    type="text"
                    value={newBusinessForm.custom_fields_webhook}
                    onChange={(e) => setNewBusinessForm({ ...newBusinessForm, custom_fields_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Custom Fields Webhook URL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer CID</label>
                    <input
                      type="text"
                      value={newBusinessForm.customer_cid}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, customer_cid: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Customer CID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Permalink</label>
                    <input
                      type="text"
                      value={newBusinessForm.permalink}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, permalink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Permalink"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newBusinessForm.va_saturday}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, va_saturday: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">VA Saturday</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newBusinessForm.va_sunday}
                      onChange={(e) => setNewBusinessForm({ ...newBusinessForm, va_sunday: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">VA Sunday</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreatePanel(false)
                  setShowOptionalCreate(false)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createBusiness}
                disabled={creatingBusiness || !newBusinessForm.company_name}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingBusiness && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{creatingBusiness ? 'Creating...' : 'Create Business'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Edit Business Panel
  if (showEditPanel && selectedBusiness) {
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
                Edit Business: {selectedBusiness.company_name}
              </h3>
            </div>
          </div>
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

        {/* Form */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Business Logo Upload Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Business Logo
              </label>
              <div className="flex items-start gap-4">
                {/* Current/Preview Image */}
                <div className="flex-shrink-0">
                  {imagePreview || selectedBusiness.avatar_url ? (
                    <img
                      src={imagePreview || selectedBusiness.avatar_url || ''}
                      alt="Business logo"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectImageClick}
                      disabled={uploadingImage}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {selectedFile ? 'Change Image' : 'Select Image'}
                    </button>

                    {selectedFile && (
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={uploadingImage}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {uploadingImage && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                      </button>
                    )}
                  </div>

                  {/* File input (hidden) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Help text - only show when file is selected */}
                  {selectedFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Required Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editBusinessForm.company_name}
                  onChange={(e) => setEditBusinessForm({ ...editBusinessForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Company Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editBusinessForm.phone}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                  <input
                    type="text"
                    value={editBusinessForm.company_type}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, company_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Roofing, HVAC, Plumbing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editBusinessForm.city}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editBusinessForm.state}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>

            {/* Optional Attributes Toggle */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowOptionalEdit(!showOptionalEdit)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showOptionalEdit ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>Show optional attributes</span>
              </button>
            </div>

            {/* Optional Fields - Same as Create */}
            {showOptionalEdit && (
              <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                {/* Copy all optional fields from Create form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                    <input
                      type="text"
                      value={editBusinessForm.street_name}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, street_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Street Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={editBusinessForm.postal_code}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Postal Code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                    <input
                      type="text"
                      value={editBusinessForm.time_zone}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, time_zone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. America/New_York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Name</label>
                    <input
                      type="text"
                      value={editBusinessForm.ai_name}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, ai_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="AI Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <input
                      type="text"
                      value={editBusinessForm.api_key}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, api_key: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="API Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                    <input
                      type="text"
                      value={editBusinessForm.location_id}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Location ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calendar ID</label>
                    <input
                      type="text"
                      value={editBusinessForm.calendar_id}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, calendar_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Calendar ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dialpad Department ID</label>
                    <input
                      type="text"
                      value={editBusinessForm.dialpad_department_id}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, dialpad_department_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dialpad Department ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retell Phone</label>
                    <input
                      type="text"
                      value={editBusinessForm.retell_phone}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, retell_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Retell Phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dialpad Phone</label>
                    <input
                      type="text"
                      value={editBusinessForm.dialpad_phone}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, dialpad_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dialpad Phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owners</label>
                  <input
                    type="text"
                    value={editBusinessForm.owners}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, owners: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Owners"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                    <input
                      type="text"
                      value={editBusinessForm.opening_hours}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, opening_hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Mon-Fri 9AM-5PM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operating In</label>
                    <input
                      type="text"
                      value={editBusinessForm.operating_in}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, operating_in: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Operating In"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge Base</label>
                  <textarea
                    value={editBusinessForm.knowledge_base}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, knowledge_base: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Knowledge Base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Callers Intent</label>
                  <textarea
                    value={editBusinessForm.callers_intent}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, callers_intent: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Callers Intent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intent Actions</label>
                  <textarea
                    value={editBusinessForm.intent_actions}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, intent_actions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Intent Actions"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Codes</label>
                    <input
                      type="text"
                      value={editBusinessForm.area_codes}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, area_codes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Area Codes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FB Account ID</label>
                    <input
                      type="text"
                      value={editBusinessForm.fb_account_id}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, fb_account_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="FB Account ID"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Webhook</label>
                  <input
                    type="text"
                    value={editBusinessForm.sms_webhook}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, sms_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SMS Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Lead Webhook</label>
                  <input
                    type="text"
                    value={editBusinessForm.pixel_lead_webhook}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, pixel_lead_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pixel Lead Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Calendar Webhook</label>
                  <input
                    type="text"
                    value={editBusinessForm.pixel_calendar_webhook}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, pixel_calendar_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pixel Calendar Webhook URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields Webhook</label>
                  <input
                    type="text"
                    value={editBusinessForm.custom_fields_webhook}
                    onChange={(e) => setEditBusinessForm({ ...editBusinessForm, custom_fields_webhook: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Custom Fields Webhook URL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer CID</label>
                    <input
                      type="text"
                      value={editBusinessForm.customer_cid}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, customer_cid: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Customer CID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Permalink</label>
                    <input
                      type="text"
                      value={editBusinessForm.permalink}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, permalink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Permalink"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editBusinessForm.va_saturday}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, va_saturday: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">VA Saturday</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editBusinessForm.va_sunday}
                      onChange={(e) => setEditBusinessForm({ ...editBusinessForm, va_sunday: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">VA Sunday</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 mt-6">
              <button
                onClick={closeEditPanel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateBusiness}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Business List
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
          {/* State Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setStateDropdownOpen(!stateDropdownOpen)
                setTypeDropdownOpen(false)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>
                {selectedState === 'all' ? 'State' : selectedState}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {stateDropdownOpen && (
              <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedState('all')
                      setStateDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All States
                  </button>
                  {states.map(state => (
                    <button
                      key={state}
                      onClick={() => {
                        setSelectedState(state)
                        setStateDropdownOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setTypeDropdownOpen(!typeDropdownOpen)
                setStateDropdownOpen(false)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>
                {selectedType === 'all' ? 'Type' : selectedType}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {typeDropdownOpen && (
              <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedType('all')
                      setTypeDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Types
                  </button>
                  {types.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type)
                        setTypeDropdownOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, city, or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Add Business Button */}
        <button
          onClick={() => setShowCreatePanel(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add Business
        </button>
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBusinesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  No businesses found
                </td>
              </tr>
            ) : (
              filteredBusinesses.map((business) => (
                <tr
                  key={business.business_id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {business.avatar_url ? (
                        <img
                          src={business.avatar_url}
                          alt={business.company_name}
                          className="w-8 h-8 rounded object-contain bg-white p-0.5"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {business.company_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {business.company_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {business.city && business.state
                        ? `${business.city}, ${business.state}`
                        : business.city || business.state || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{business.company_type || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{business.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPanel(business)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit business"
                      >
                        <Edit className="w-4 h-4" />
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
