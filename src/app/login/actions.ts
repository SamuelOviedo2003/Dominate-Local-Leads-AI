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
    let accessibleBusinesses: any[] = []
    
    // Handle null role by treating as regular user (role 1)
    const effectiveRole = profile.role ?? 1
    
    if (effectiveRole === 0) {
      // Super admin - get all businesses with dashboard enabled using service role
      const { data: businesses } = await supabaseService
        .from('business_clients')
        .select('business_id, company_name, avatar_url, city, state, permalink')
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
            state,
            permalink
          )
        `)
        .eq('profile_id', user.id)
      
      if (businessError) {
        console.error('Business fetch error:', businessError)
      }
      
      if (userBusinesses) {
        accessibleBusinesses = userBusinesses.map((ub: any) => ({
          business_id: ub.business_clients.business_id.toString(),
          company_name: ub.business_clients.company_name,
          avatar_url: ub.business_clients.avatar_url,
          city: ub.business_clients.city,
          state: ub.business_clients.state,
          permalink: ub.business_clients.permalink
        }))
      }
    }

    // Smart redirection logic with permalink-based URLs
    revalidatePath('/', 'layout')
    
    if (effectiveRole === 0) {
      // Super admin - redirect to first business or profile management
      if (accessibleBusinesses.length > 0) {
        const firstBusiness = accessibleBusinesses[0] as any
        if (firstBusiness?.permalink) {
          redirect(`/${firstBusiness.permalink}/dashboard`)
        } else {
          // If business has no permalink, there's a data integrity issue
          redirect('/login?error=Business configuration error. Please contact support.')
        }
      } else {
        // Super admin with no businesses should get first business permalink for profile management
        // Get the first available business for profile management context
        const supabaseService = createServiceRoleClient()
        const { data: businesses } = await supabaseService
          .from('business_clients')
          .select('permalink')
          .eq('dashboard', true)
          .order('company_name')
          .limit(1)
        
        if (businesses && businesses.length > 0 && businesses[0]?.permalink) {
          redirect(`/${businesses[0].permalink}/profile-management`)
        } else {
          redirect('/login?error=No businesses available for profile management. Please contact support.')
        }
      }
    } else {
      // Regular user
      if (accessibleBusinesses.length === 0) {
        // User has no business assignments - redirect to error page
        redirect('/login?error=No business access assigned. Please contact support.')
      } else {
        // User has business access - redirect to their first business's dashboard
        const firstBusiness = accessibleBusinesses[0] as any
        if (firstBusiness?.permalink) {
          redirect(`/${firstBusiness.permalink}/dashboard`)
        } else {
          // If business has no permalink, there's a data integrity issue
          redirect('/login?error=Business configuration error. Please contact support.')
        }
      }
    }
    
  } catch (error) {
    console.error('Error during post-login processing:', error)
    // If there's an error in the post-login logic, redirect to login with error
    // Avoid fallback to base /dashboard route to maintain permalink consistency
    revalidatePath('/', 'layout')
    redirect('/login?error=Login processing failed. Please try again or contact support.')
  }
}