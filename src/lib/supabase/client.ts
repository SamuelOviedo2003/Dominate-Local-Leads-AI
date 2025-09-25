import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a browser-side Supabase client using default cookie behavior
 * Uses Supabase SSR's built-in cookie handling for proper session management
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    // Use default cookie behavior - no custom storage override
    // This allows Supabase to create both sb-auth-token and sb-{project-id}-auth-token
  )
}