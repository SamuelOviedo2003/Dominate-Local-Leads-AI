'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { AuthUser } from '@/types/auth'

interface AuthDataContextType {
  user: AuthUser
  business: {
    business_id: string | number
    company_name: string
    permalink: string
    dashboard?: boolean
    avatar_url?: string | null
    city?: string | null
    state?: string | null
  }
  effectiveRole: number
}

const AuthDataContext = createContext<AuthDataContextType | null>(null)

interface AuthDataProviderProps {
  children: ReactNode
  user: AuthUser
  business: {
    business_id: string | number
    company_name: string
    permalink: string
    dashboard?: boolean
    avatar_url?: string | null
    city?: string | null
    state?: string | null
  }
  effectiveRole: number
}

/**
 * AuthDataProvider passes cached authentication and business data
 * from server components to client components, eliminating redundant API calls
 */
export function AuthDataProvider({
  children,
  user,
  business,
  effectiveRole
}: AuthDataProviderProps) {
  console.log('[AUTH_DATA_CONTEXT] Providing cached auth data to client components')

  return (
    <AuthDataContext.Provider
      value={{ user, business, effectiveRole }}
    >
      {children}
    </AuthDataContext.Provider>
  )
}

/**
 * Hook to access cached authentication data
 * Returns the user, business, and role data fetched once in the parent layout
 */
export function useAuthData() {
  const context = useContext(AuthDataContext)

  if (!context) {
    throw new Error('useAuthData must be used within an AuthDataProvider')
  }

  return context
}

/**
 * Hook to safely access authentication data with fallback
 * Returns null if not available instead of throwing an error
 */
export function useOptionalAuthData() {
  return useContext(AuthDataContext)
}