'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createCookieClient } from '@/lib/supabase/server'

export async function logout() {
  const supabase = createCookieClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // For localStorage-based auth, we need to ensure client-side cleanup
  // This will be handled by the client-side logout component
  
  revalidatePath('/', 'layout')
  redirect('/login')
}