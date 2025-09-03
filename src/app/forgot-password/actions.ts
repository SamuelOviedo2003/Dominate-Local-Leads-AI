'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server action for password reset using Supabase resetPasswordForEmail
 * 
 * @param formData - Form data containing email address for password reset
 * 
 * This function:
 * 1. Validates email format and presence
 * 2. Calls Supabase resetPasswordForEmail with proper redirect URL
 * 3. Handles error reporting and success redirects
 * 4. Follows PKCE flow patterns for Next.js 14 App Router
 * 5. Uses the new /auth/reset-password endpoint as specified
 */
export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  // Extract and validate email
  const email = formData.get('email') as string

  // Input validation
  if (!email || !email.includes('@') || email.length < 5) {
    redirect('/forgot-password?error=Please enter a valid email address')
  }

  try {
    // Get the site URL from environment with proper fallback handling
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    
    // If not set, provide appropriate fallbacks based on environment
    if (!siteUrl) {
      if (process.env.NODE_ENV === 'development') {
        siteUrl = 'http://localhost:3001'
        console.warn('⚠️  NEXT_PUBLIC_SITE_URL not set, using development fallback:', siteUrl)
      } else {
        // In production, try to determine the URL from request headers or use known production URL
        const prodUrl = 'https://dominatelocalleadsai.sliplane.app'
        console.warn('⚠️  NEXT_PUBLIC_SITE_URL not set in production, using fallback:', prodUrl)
        console.warn('⚠️  Please set NEXT_PUBLIC_SITE_URL environment variable in production for proper configuration')
        siteUrl = prodUrl
      }
    }
    
    // Ensure the site URL doesn't contain localhost in production
    if (process.env.NODE_ENV === 'production' && siteUrl.includes('localhost')) {
      const prodUrl = 'https://dominatelocalleadsai.sliplane.app'
      console.error('❌ CRITICAL: Production environment using localhost URL:', siteUrl)
      console.warn('⚠️  Using production fallback URL:', prodUrl)
      siteUrl = prodUrl
    }

    console.log('=== FORGOT PASSWORD DEBUG ===')
    console.log(`Attempting password reset for email: ${email}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`Site URL: ${siteUrl}`)
    console.log(`Redirect URL will be: ${siteUrl}/auth/reset-password`)

    // Validate site URL format
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      console.error('❌ Invalid site URL format:', siteUrl)
      redirect('/forgot-password?error=Configuration error. Please contact support.')
    }

    // Send password reset email using Supabase
    // The redirectTo URL will be used after the user clicks the email link
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`
    })

    console.log('Supabase resetPasswordForEmail response:')
    console.log('  - Data:', JSON.stringify(data, null, 2))
    console.log('  - Error:', error ? JSON.stringify(error, null, 2) : 'None')

    if (error) {
      console.error('Password reset email error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      })
      
      // Handle specific Supabase errors
      if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        redirect('/forgot-password?error=Too many password reset attempts. Please try again later')
      } else if (error.message.includes('invalid email') || error.message.includes('Invalid email')) {
        redirect('/forgot-password?error=Please enter a valid email address')
      } else if (error.message.includes('User not found') || error.message.includes('user not found')) {
        // For security, don't reveal that user doesn't exist - show neutral success message
        redirect('/forgot-password?success=If an account with that email exists, you will receive a password reset link')
      } else {
        // For security, don't reveal specific errors to client but log them
        console.error('Supabase resetPasswordForEmail error:', error.message)
        redirect('/forgot-password?success=If an account with that email exists, you will receive a password reset link')
      }
    }

    console.log('✅ Password reset email sent successfully')
    console.log('=== END FORGOT PASSWORD DEBUG ===')
    
    // Success - redirect with neutral success message to prevent account enumeration
    redirect('/forgot-password?success=If an account with that email exists, you will receive a password reset link')

  } catch (error) {
    // Check if it's a redirect error (this is normal Next.js behavior)
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      // Don't log NEXT_REDIRECT as an error - it's expected behavior
      throw error // Re-throw redirect errors
    }
    
    // Only log actual unexpected errors
    console.error('Unexpected password reset error:', error)
    redirect('/forgot-password?error=An unexpected error occurred. Please try again')
  }
}