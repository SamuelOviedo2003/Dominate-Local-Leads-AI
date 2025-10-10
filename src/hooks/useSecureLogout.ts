'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useSecureLogout() {
  const router = useRouter()

  const logout = async () => {
    try {
      // 1. Call server-side logout API to clear cookies properly
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Important: include cookies in request
      })

      // 2. Sign out from Supabase client
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'global' })

      // 3. Clear ALL client-side storage
      if (typeof window !== 'undefined') {
        // Clear all localStorage
        localStorage.clear()

        // Clear all sessionStorage
        sessionStorage.clear()

        // Also manually clear any remaining Supabase cookies via document.cookie
        const cookies = document.cookie.split(';')
        cookies.forEach((cookie) => {
          const cookieParts = cookie.split('=')
          const cookieName = cookieParts[0]?.trim()
          if (cookieName && (cookieName.startsWith('sb-') || cookieName.includes('auth-token'))) {
            // Delete cookie by setting it to expire in the past
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            // Also try with domain to ensure deletion
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
          }
        })
      }

      // 4. Force a hard navigation to login and refresh to clear any cached state
      window.location.href = '/login'

    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, clear everything and redirect
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      window.location.href = '/login'
    }
  }

  return { logout }
}