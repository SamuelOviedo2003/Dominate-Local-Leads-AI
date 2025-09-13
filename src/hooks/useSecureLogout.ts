'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useSecureLogout() {
  const router = useRouter()
  
  const logout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Clear localStorage auth tokens
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-auth-token')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      router.push('/login')
      
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  return { logout }
}