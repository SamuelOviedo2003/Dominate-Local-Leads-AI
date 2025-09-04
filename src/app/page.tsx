import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUserForAPI } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  // Use proper authentication validation that checks session validity and business access
  // This prevents redirect loops caused by invalid/expired sessions
  const authenticatedUser = await getAuthenticatedUserForAPI()
  
  if (authenticatedUser) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}