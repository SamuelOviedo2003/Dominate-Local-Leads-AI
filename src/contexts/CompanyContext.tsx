'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessSwitcherData } from '@/types/auth'

interface CompanyContextType {
  selectedCompany: BusinessSwitcherData | null
  availableCompanies: BusinessSwitcherData[]
  setSelectedCompany: (company: BusinessSwitcherData) => void
  setAvailableCompanies: (companies: BusinessSwitcherData[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  userRole?: number
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

interface CompanyProviderProps {
  children: ReactNode
  initialCompany?: BusinessSwitcherData | null
  availableCompanies?: BusinessSwitcherData[]
  userRole?: number
}

export function CompanyProvider({ 
  children, 
  initialCompany = null,
  availableCompanies = [],
  userRole
}: CompanyProviderProps) {
  const [selectedCompany, setSelectedCompanyState] = useState<BusinessSwitcherData | null>(initialCompany)
  const [companies, setAvailableCompanies] = useState<BusinessSwitcherData[]>(availableCompanies)
  const [isLoading, setIsLoading] = useState(false)

  // Load selected company from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCompanyId = localStorage.getItem('selectedCompanyId')
      if (storedCompanyId && companies.length > 0) {
        const storedCompany = companies.find(c => c.business_id === storedCompanyId)
        if (storedCompany) {
          setSelectedCompanyState(storedCompany)
        }
      }
    }
  }, [companies])

  const setSelectedCompany = (company: BusinessSwitcherData) => {
    setSelectedCompanyState(company)
    
    // Persist selection to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCompanyId', company.business_id)
    }
  }

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        availableCompanies: companies,
        setSelectedCompany,
        setAvailableCompanies,
        isLoading,
        setIsLoading,
        userRole
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

/**
 * Hook to get the effective business ID for data fetching
 * For superadmins, returns the selected company's business_id
 * For regular users, returns the first available business from their accessible businesses
 */
export function useEffectiveBusinessId(): string {
  const { selectedCompany, availableCompanies, userRole } = useCompany()
  
  // If user is superadmin (role 0) and has selected a company, use that
  if (userRole === 0 && selectedCompany) {
    return selectedCompany.business_id
  }
  
  // Otherwise, use the first available business (for regular users this will be their assigned business)
  return selectedCompany?.business_id || availableCompanies[0]?.business_id || ''
}