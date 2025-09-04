'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Invalid credentials')
  }

  // After successful authentication, determine redirect destination based on user role and business access
  try {
    // Wait a moment for session to be established, then get user
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login?error=Authentication failed')
    }

    // Get user profile to check role - using service role to bypass RLS
    // This fixes the infinite recursion issue in RLS policies
    const supabaseService = createServiceRoleClient()
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profileError) {
      console.error('Profile fetch error:', profileError)
      redirect('/login?error=User profile not found')
    }

    // Get user's accessible businesses using the new profile_businesses system
    let accessibleBusinesses = []
    
    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1
    
    if (effectiveRole === 0) {
      // Super admin - get all businesses with dashboard enabled using service role
      const { data: businesses } = await supabaseService
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state')
        .eq('dashboard', true)
        .order('company_name')
      
      accessibleBusinesses = businesses || []
    } else {
      // Regular user - get businesses from profile_businesses table
      const { data: userBusinesses, error: businessError } = await supabase
        .from('profile_businesses')
        .select(`
          business_id,
          business_clients!inner(
            business_id,
            company_name,
            avatar_url,
            city,
            state
          )
        `)
        .eq('profile_id', user.id)
      
      if (businessError) {
        console.error('Business fetch error:', businessError)
      }
      
      if (userBusinesses) {
        accessibleBusinesses = userBusinesses.map(ub => ({
          business_id: ub.business_clients.business_id.toString(),
          company_name: ub.business_clients.company_name,
          avatar_url: ub.business_clients.avatar_url,
          city: ub.business_clients.city,
          state: ub.business_clients.state
        }))
      }
    }

    // Smart redirection logic
    revalidatePath('/', 'layout')
    
    if (effectiveRole === 0) {
      // Super admin - redirect to profile management or admin dashboard
      if (accessibleBusinesses.length > 0) {
        redirect('/dashboard')
      } else {
        redirect('/profile-management')
      }
    } else {
      // Regular user
      if (accessibleBusinesses.length === 0) {
        // User has no business assignments - redirect to error page
        redirect('/login?error=No business access assigned. Please contact support.')
      } else {
        // User has business access - redirect to dashboard
        redirect('/dashboard')
      }
    }
    
  } catch (error) {
    console.error('Error during post-login processing:', error)
    // If there's an error in the post-login logic, still redirect to dashboard
    // The dashboard will handle any access issues
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }
}