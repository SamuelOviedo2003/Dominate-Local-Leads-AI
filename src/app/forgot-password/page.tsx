import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ForgotPasswordForm from '@/components/ForgotPasswordForm'
import ImageWithFallback from '@/components/ImageWithFallback'
import LoginLogo from '@/components/LoginLogo'
import { ComponentLoading } from '@/components/LoadingSystem'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-slate-800 via-brand-slate-700 to-brand-orange-900 animate-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-orange-300/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-slate-300/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Company Logo */}
        <div className="text-center mb-8 animate-slide-down">
          <div className="relative inline-block animate-logo-entrance">
            <LoginLogo className="mx-auto h-auto max-h-24 object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105" />
            {/* Subtle glow effect behind logo */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-orange-500/20 via-brand-orange-400/30 to-brand-orange-300/20 rounded-full blur-xl scale-150 opacity-0 animate-logo-glow"></div>
          </div>
        </div>

        {/* Glass Morphism Forgot Password Form */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 animate-scale-in relative group hover:bg-white/15 transition-all duration-300">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-brand-orange-400/20 via-brand-orange-300/20 to-brand-slate-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
          
          <div className="relative z-10">
            <Suspense fallback={
              <div className="py-8">
                <ComponentLoading message="Loading forgot password form..." />
              </div>
            }>
              <ForgotPasswordForm />
            </Suspense>
          </div>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-white/20 rounded-full animate-float"></div>
          <div className="absolute top-40 right-16 w-1 h-1 bg-brand-orange-300/30 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-32 left-20 w-1.5 h-1.5 bg-brand-slate-300/25 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-20 right-12 w-1 h-1 bg-white/15 rounded-full animate-float" style={{ animationDelay: '2.5s' }}></div>
        </div>
      </div>
    </div>
  )
}