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
    redirect('/signup?error=Please enter a valid email address')
  }

  if (!password || password.length < 6) {
    redirect('/signup?error=Password must be at least 6 characters')
  }

  if (!fullName || fullName.trim().length < 2) {
    redirect('/signup?error=Please enter a valid full name')
  }

  if (password !== confirmPassword) {
    redirect('/signup?error=Passwords do not match')
  }

  try {
    // Step 1: Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      redirect(`/signup?error=${encodeURIComponent(authError.message)}`)
    }

    if (!authData.user) {
      redirect('/signup?error=Failed to create user account')
    }

    // Step 2: Create profile record in profiles table
    // Default to business_id 1 if not specified, or parse provided business_id
    const profileBusinessId = businessId ? parseInt(businessId) : 1
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        role: 1, // Default role (non-admin)
        business_id: profileBusinessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // If profile creation fails, we should clean up the auth user
      // However, Supabase doesn't provide admin delete from client
      // Log the error and redirect with specific message
      redirect('/signup?error=Account created but profile setup failed. Please contact support.')
    }

    // Step 3: Verify business association exists
    const { data: businessData, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id, company_name')
      .eq('business_id', profileBusinessId)
      .single()

    if (businessError || !businessData) {
      console.error('Business association error:', businessError)
      // Don't fail signup for business association issues, just log
      console.warn(`User ${authData.user.id} created but business ${profileBusinessId} not found`)
    }

    // Step 4: Success - revalidate and redirect
    revalidatePath('/', 'layout')
    redirect('/dashboard')

  } catch (error) {
    console.error('Unexpected signup error:', error)
    redirect('/signup?error=An unexpected error occurred. Please try again.')
  }
}