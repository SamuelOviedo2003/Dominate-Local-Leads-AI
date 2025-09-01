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
    // Get the site URL from environment or use localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://yourapp.com')

    console.log(`Attempting password reset for email: ${email}`)
    console.log(`Redirect URL will be: ${siteUrl}/auth/confirm?next=/account/update-password`)

    // Send password reset email using Supabase
    // The redirectTo URL will be used after the user clicks the email link
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/account/update-password`
    })

    console.log('Supabase resetPasswordForEmail response:', { data, error })

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

    console.log('Password reset email sent successfully')
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