'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server action for user signup with profile creation and business association
 * 
 * @param formData - Form data containing signup information
 * 
 * This function:
 * 1. Validates input data including password confirmation
 * 2. Creates user account in Supabase Auth
 * 3. Creates corresponding profile record in profiles table
 * 4. Associates user with business (defaults to business_id 1 for new users)
 * 5. Handles proper error reporting and redirects
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Extract and validate form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const fullName = formData.get('fullName') as string
  const businessId = formData.get('businessId') as string

  // Input validation
  if (!email || !email.includes('@')) {
    redirect('/login?error=Please enter a valid email address&mode=signup')
  }

  if (!password || password.length < 6) {
    redirect('/login?error=Password must be at least 6 characters&mode=signup')
  }

  if (!fullName || fullName.trim().length < 2) {
    redirect('/login?error=Please enter a valid full name&mode=signup')
  }

  if (password !== confirmPassword) {
    redirect('/login?error=Passwords do not match&mode=signup')
  }

  try {
    console.log('[SIGNUP] Starting signup process for:', email)
    
    // Step 1: Create user account in Supabase Auth
    // Include all profile data in user metadata for the database trigger
    console.log('[SIGNUP] Creating auth user...')
    const profileBusinessId = businessId ? parseInt(businessId) : 1
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_id: profileBusinessId.toString(),
          role: '1' // Default role (non-admin)
        }
      }
    })

    if (authError) {
      console.error('[SIGNUP] Auth signup error:', authError)
      redirect(`/login?error=${encodeURIComponent(authError.message)}&mode=signup`)
    }

    if (!authData.user) {
      console.error('[SIGNUP] No user data returned from auth signup')
      redirect('/login?error=Failed to create user account&mode=signup')
    }

    console.log('[SIGNUP] Auth user created successfully:', authData.user.id)

    // Step 2: Profile is automatically created by database trigger
    console.log('[SIGNUP] Profile automatically created by database trigger')

    // Step 3: Verify business association exists (optional check)
    console.log('[SIGNUP] Verifying business association for business_id:', profileBusinessId)
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id, company_name')
      .eq('business_id', profileBusinessId)
      .single()

    if (businessError || !businessData) {
      console.error('[SIGNUP] Business association error:', businessError)
      // Don't fail signup for business association issues, just log
      console.warn(`[SIGNUP] User ${authData.user.id} created but business ${profileBusinessId} not found`)
    } else {
      console.log('[SIGNUP] Business association verified:', businessData.company_name)
    }

    // Step 4: Success - revalidate and redirect
    console.log('[SIGNUP] Signup completed successfully, redirecting to confirmation message...')
    revalidatePath('/', 'layout')
    
    // Check if user needs to confirm email
    if (!authData.user?.email_confirmed_at) {
      redirect('/login?success=Account created successfully! Please check your email to confirm your account before signing in.&mode=login')
    } else {
      redirect('/dashboard')
    }

  } catch (error) {
    console.error('[SIGNUP] Unexpected signup error:', error)
    
    // Don't catch NEXT_REDIRECT errors - let them bubble up
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    
    // Provide more specific error information for other errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    redirect(`/login?error=${encodeURIComponent(errorMessage)}. Please try again.&mode=signup`)
  }
}