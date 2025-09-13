import { createBrowserClient } from '@supabase/ssr'

class LocalStorageAdapter {
  private keyPrefix = 'sb-auth-token'
  
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${this.keyPrefix}-${key}`)
  }
  
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${this.keyPrefix}-${key}`, value)
  }
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${this.keyPrefix}-${key}`)
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      auth: {
        persistSession: true,
        storage: new LocalStorageAdapter(),
        autoRefreshToken: true,
        detectSessionInUrl: false // Disable to prevent URL-based session attacks
      }
    }
  )
}