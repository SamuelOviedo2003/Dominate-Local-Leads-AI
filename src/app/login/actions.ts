'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Email and password are required')
  }

  // For the new localStorage+JWT system, we cannot handle login server-side
  // because we need to store the session in the browser's localStorage.
  // The login should be handled client-side using the Supabase client.
  
  // For now, redirect back to login to be handled by client-side code
  redirect('/login?error=Please use client-side login')
}

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !password || !fullName || !confirmPassword) {
    redirect('/login?error=All fields are required&mode=signup')
  }

  if (password !== confirmPassword) {
    redirect('/login?error=Passwords do not match&mode=signup')
  }

  // Create a server client for authentication only (no persistent sessions)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() { /* no-op */ },
      },
    }
  )

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&mode=signup`)
  }

  redirect('/login?success=Please check your email for confirmation link&mode=signup')
}

// Legacy alias for compatibility
export const login = loginAction