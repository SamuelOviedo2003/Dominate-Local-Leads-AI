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
 */
export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  // Extract and validate email
  const email = formData.get('email') as string

  // Input validation
  if (!email || !email.includes('@') || email.length < 5) {
    redirect('/login?error=Please enter a valid email address&mode=forgotPassword')
  }

  try {
    // Get the site URL from environment with proper fallback handling
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    
    // If not set, provide appropriate fallbacks based on environment
    if (!siteUrl) {
      if (process.env.NODE_ENV === 'development') {
        siteUrl = 'http://localhost:3000'
        console.warn('⚠️  NEXT_PUBLIC_SITE_URL not set, using development fallback:', siteUrl)
      } else {
        console.error('❌ CRITICAL: NEXT_PUBLIC_SITE_URL must be set in production environment')
        redirect('/login?error=Server configuration error. Please contact support.&mode=forgotPassword')
      }
    }
    
    // Ensure the site URL doesn't contain localhost in production
    if (process.env.NODE_ENV === 'production' && siteUrl.includes('localhost')) {
      console.error('❌ CRITICAL: Production environment using localhost URL:', siteUrl)
      redirect('/login?error=Server configuration error. Please contact support.&mode=forgotPassword')
    }

    console.log('=== FORGOT PASSWORD DEBUG ===')
    console.log(`Attempting password reset for email: ${email}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`Site URL: ${siteUrl}`)
    console.log(`Redirect URL will be: ${siteUrl}/auth/confirm?next=/account/update-password`)
    console.log(`Full reset URL: ${siteUrl}/auth/confirm?token_hash=[TOKEN]&type=recovery&next=/account/update-password`)

    // Validate site URL format
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      console.error('❌ Invalid site URL format:', siteUrl)
      redirect('/login?error=Configuration error. Please contact support.&mode=forgotPassword')
    }

    // Send password reset email using Supabase
    // The redirectTo URL will be used after the user clicks the email link
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/account/update-password`
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
        redirect('/login?error=Too many password reset attempts. Please try again later&mode=forgotPassword')
      } else if (error.message.includes('invalid email') || error.message.includes('Invalid email')) {
        redirect('/login?error=Please enter a valid email address&mode=forgotPassword')
      } else if (error.message.includes('User not found') || error.message.includes('user not found')) {
        // For security, don't reveal that user doesn't exist
        redirect('/login?success=If an account with that email exists, you will receive a password reset link&mode=forgotPassword')
      } else {
        // For security, don't reveal specific errors to client but log them
        console.error('Supabase resetPasswordForEmail error:', error.message)
        redirect('/login?success=If an account with that email exists, you will receive a password reset link&mode=forgotPassword')
      }
    }

    console.log('✅ Password reset email sent successfully')
    console.log('=== END FORGOT PASSWORD DEBUG ===')
    // Success - redirect with success message
    redirect('/login?success=If an account with that email exists, you will receive a password reset link&mode=forgotPassword')

  } catch (error) {
    console.error('Unexpected password reset error:', error)
    
    // Check if it's a redirect error (this is normal Next.js behavior)
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error // Re-throw redirect errors
    }
    
    redirect('/login?error=An unexpected error occurred. Please try again&mode=forgotPassword')
  }
}