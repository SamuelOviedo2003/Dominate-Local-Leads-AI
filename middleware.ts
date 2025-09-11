import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { enhancedSessionMiddleware, startSecurityCleanup } from '@/lib/enhanced-session-middleware'
import { initializeSessionStore } from '@/lib/redis-session-store'
import { setupDevelopmentDiagnostics } from '@/lib/session-diagnostics'

// Initialize session store and security cleanup on first middleware execution
let initialized = false
async function initialize() {
  if (!initialized) {
    console.log('[MIDDLEWARE] Initializing session security systems...')
    await initializeSessionStore()
    startSecurityCleanup()
    setupDevelopmentDiagnostics()
    initialized = true
    console.log('[MIDDLEWARE] Session security systems initialized')
  }
}

export async function middleware(request: NextRequest) {
  // Initialize session security systems
  await initialize()
  
  // Apply enhanced session security middleware first
  const securityResponse = await enhancedSessionMiddleware(request)
  
  // If security middleware returned a response (redirect, etc.), use it
  if (securityResponse.status !== 200 || securityResponse.redirected) {
    return securityResponse
  }
  
  // Otherwise, continue with Supabase session management
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}