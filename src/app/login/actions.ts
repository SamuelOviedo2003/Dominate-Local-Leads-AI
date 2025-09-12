'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, getAvailableBusinessesWithToken } from '@/lib/auth-utils'

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

    // Get authenticated user with profile and accessible businesses via JWT
    const authenticatedUser = await getAuthenticatedUser()
    if (!authenticatedUser || authenticatedUser.id !== user.id) {
      redirect('/login?error=Authentication failed')
    }

    // Get user's accessible businesses using JWT-based approach
    const accessibleBusinessesData = await getAvailableBusinessesWithToken(user.id)
    const accessibleBusinesses = accessibleBusinessesData.map(b => ({
      business_id: parseInt(b.id),
      company_name: b.name,
      avatar_url: b.avatar_url,
      city: b.city,
      state: b.state,
      permalink: b.permalink
    }))
    
    const effectiveRole = authenticatedUser.role

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
        // Get the first available business for profile management context using JWT
        const { data: businesses } = await supabase
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