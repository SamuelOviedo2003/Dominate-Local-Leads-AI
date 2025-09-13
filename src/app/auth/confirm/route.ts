import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase/server'

/**
 * API Route for handling email confirmation tokens in PKCE flow
 * 
 * This route handles:
 * 1. Email confirmations for new signups (type=email)
 * 2. Password reset confirmations (type=recovery) - redirects to /auth/reset-password
 * 3. Email change confirmations (type=email_change)
 * 
 * Note: Password reset links now go directly to /auth/reset-password with code parameter
 * This route provides backward compatibility for recovery types that might still land here
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Enhanced debugging logs
  console.log('=== AUTH CONFIRM ROUTE DEBUG ===')
  console.log('Full URL:', request.url)
  console.log('Search params:', Object.fromEntries(searchParams))
  console.log('Token hash present:', !!token_hash, token_hash ? 'Length: ' + token_hash.length : 'N/A')
  console.log('Type:', type)
  console.log('Next URL:', next)
  console.log('Environment:', process.env.NODE_ENV)
  console.log('Site URL:', process.env.NEXT_PUBLIC_SITE_URL)

  // Validate required parameters
  if (!token_hash || !type) {
    console.error('❌ Missing required parameters:')
    console.error('  - token_hash:', !!token_hash)
    console.error('  - type:', !!type)
    console.error('  - Available params:', Array.from(searchParams.keys()))
    
    return NextResponse.redirect(new URL('/login?error=Invalid confirmation link - missing parameters', request.url))
  }

  // Validate token hash format (should be a hex string)
  if (!/^[a-f0-9]+$/i.test(token_hash)) {
    console.error('❌ Invalid token_hash format:', token_hash)
    return NextResponse.redirect(new URL('/login?error=Invalid confirmation link - malformed token', request.url))
  }

  // Validate type parameter
  const validTypes: EmailOtpType[] = ['signup', 'invite', 'recovery', 'email_change', 'email', 'magiclink']
  if (!validTypes.includes(type)) {
    console.error('❌ Invalid type parameter:', type, 'Valid types:', validTypes)
    return NextResponse.redirect(new URL('/login?error=Invalid confirmation link - invalid type', request.url))
  }

  try {
    const supabase = createCookieClient()
    console.log('✅ Supabase client created successfully')

    // For password recovery, redirect to the new reset password page with code
    if (type === 'recovery') {
      console.log('🔄 Recovery type detected, redirecting to new reset password flow')
      const code = searchParams.get('code') || token_hash
      if (code) {
        const redirectUrl = new URL(`/auth/reset-password?code=${code}`, request.url)
        console.log('🔄 Redirecting to:', redirectUrl.toString())
        return NextResponse.redirect(redirectUrl)
      }
    }

    // For other types, use the modern exchangeCodeForSession approach
    console.log('🔄 Attempting code exchange for session...')
    const code = searchParams.get('code') || token_hash
    
    if (!code) {
      console.error('❌ No code available for session exchange')
      return NextResponse.redirect(new URL('/login?error=Invalid confirmation link - missing code', request.url))
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('❌ Code exchange failed:')
      console.error('  - Error message:', error.message)
      console.error('  - Error code:', error.status || 'N/A')
      console.error('  - Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Invalid or expired confirmation link'
      let redirectPath = '/login'
      
      // Provide more specific error messages based on type and error
      if (type === 'recovery') {
        errorMessage = 'Password reset link has expired or is invalid. Please request a new one.'
        redirectPath = '/forgot-password'
      } else if (type === 'email') {
        errorMessage = 'Email confirmation link has expired or is invalid. Please sign up again.'
        redirectPath = '/login'
      }

      // Handle specific error cases
      if (error.message?.includes('expired')) {
        errorMessage = 'This link has expired. Please request a new one.'
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'This link is invalid. Please check your email for the correct link.'
      } else if (error.message?.includes('already')) {
        errorMessage = 'This action has already been completed. You can now sign in.'
      }

      const redirectUrl = new URL(`${redirectPath}?error=${encodeURIComponent(errorMessage)}`, request.url)
      console.log('🔄 Redirecting to error page:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl)
    }

    if (!data.user) {
      console.error('❌ No user returned from code exchange')
      console.error('  - Data received:', JSON.stringify(data, null, 2))
      return NextResponse.redirect(new URL('/login?error=Authentication failed. No user data received.', request.url))
    }

    // Success! Enhanced success logging
    console.log('✅ Code exchange successful!')
    console.log('  - User ID:', data.user.id)
    console.log('  - User email:', data.user.email)
    console.log('  - Type processed:', type)
    console.log('  - Session created:', !!data.session)
    
    // Determine the correct redirect URL based on type
    let redirectUrl = next
    if (type === 'recovery') {
      // For password reset, redirect to new reset password page (backup flow)
      redirectUrl = '/auth/reset-password'
      console.log('🔄 Password reset flow - redirecting to reset password page')
    } else {
      console.log('🔄 Other auth flow - redirecting to:', next)
    }

    const finalRedirectUrl = new URL(redirectUrl, request.url)
    console.log('🔄 Final redirect URL:', finalRedirectUrl.toString())
    console.log('=== END AUTH CONFIRM DEBUG ===')
    
    return NextResponse.redirect(finalRedirectUrl)

  } catch (error) {
    console.error('❌ Unexpected error during code exchange:')
    console.error('  - Error:', error)
    console.error('  - Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('=== END AUTH CONFIRM DEBUG (ERROR) ===')
    
    return NextResponse.redirect(new URL('/login?error=An unexpected server error occurred. Please try again.', request.url))
  }
}