import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route for handling email confirmation tokens in PKCE flow
 * 
 * This route handles:
 * 1. Email confirmations for new signups (type=email)
 * 2. Password reset confirmations (type=recovery)  
 * 3. Email change confirmations (type=email_change)
 * 
 * For password reset, it redirects to /account/update-password
 * For other confirmations, it redirects to the specified 'next' URL or dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Validate required parameters
  if (!token_hash || !type) {
    console.error('Missing token_hash or type in confirmation URL')
    return NextResponse.redirect(new URL('/login?error=Invalid confirmation link', request.url))
  }

  try {
    const supabase = await createClient()

    // Verify the OTP token hash
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('Token verification error:', error)
      let errorMessage = 'Invalid or expired confirmation link'
      
      // Provide more specific error messages based on type
      if (type === 'recovery') {
        errorMessage = 'Password reset link has expired or is invalid. Please request a new one.'
      } else if (type === 'email') {
        errorMessage = 'Email confirmation link has expired or is invalid. Please sign up again.'
      }

      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url))
    }

    if (!data.user) {
      console.error('No user returned from token verification')
      return NextResponse.redirect(new URL('/login?error=Authentication failed. Please try again.', request.url))
    }

    // Success! Redirect to the specified next URL
    console.log(`User ${data.user.email} successfully verified ${type} token`)
    return NextResponse.redirect(new URL(next, request.url))

  } catch (error) {
    console.error('Unexpected error during token verification:', error)
    return NextResponse.redirect(new URL('/login?error=An unexpected error occurred. Please try again.', request.url))
  }
}