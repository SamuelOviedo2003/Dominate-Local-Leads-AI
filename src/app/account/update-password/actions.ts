'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createCookieClient } from '@/lib/supabase/server'

/**
 * Server action for updating user password after successful token verification
 * 
 * @param formData - Form data containing new password and confirmation
 * 
 * This function:
 * 1. Validates that user is authenticated (has valid session from token verification)
 * 2. Validates password requirements and confirmation match
 * 3. Updates user password using Supabase updateUser
 * 4. Handles proper error reporting and success redirects
 */
export async function updatePassword(formData: FormData) {
  const supabase = createCookieClient()

  // Check if user is authenticated (should have session from token verification)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('User not authenticated for password update:', userError)
    redirect('/login?error=Authentication required. Please use the password reset link from your email.')
  }

  // Extract and validate form data
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Input validation
  if (!password || password.length < 6) {
    redirect('/account/update-password?error=Password must be at least 6 characters')
  }

  if (!confirmPassword) {
    redirect('/account/update-password?error=Please confirm your password')
  }

  if (password !== confirmPassword) {
    redirect('/account/update-password?error=Passwords do not match')
  }

  // Additional password strength validation (optional but recommended)
  if (password.length < 8) {
    redirect('/account/update-password?error=Password should be at least 8 characters for better security')
  }

  try {
    // Update user password
    const { data, error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      console.error('Password update error:', error)
      redirect(`/account/update-password?error=${encodeURIComponent(error.message)}`)
    }

    if (!data.user) {
      redirect('/account/update-password?error=Failed to update password. Please try again.')
    }

    // Success - password updated
    console.log(`Password successfully updated for user: ${data.user.email}`)
    
    // Revalidate any cached data and redirect to dashboard
    revalidatePath('/', 'layout')
    redirect('/dashboard?success=Password updated successfully')

  } catch (error) {
    console.error('Unexpected password update error:', error)
    redirect('/account/update-password?error=An unexpected error occurred. Please try again.')
  }
}