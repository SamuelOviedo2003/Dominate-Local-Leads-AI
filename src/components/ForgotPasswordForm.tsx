'use client'

import { useState, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { InlineLoading } from '@/components/LoadingSystem'

/**
 * Forgot Password Form Component
 * Implements secure password reset request with neutral success messages
 */
export default function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const email = formData.get('email') as string

      // Client-side validation
      if (!email || !email.includes('@') || email.length < 5) {
        window.location.href = '/forgot-password?error=Please enter a valid email address'
        return
      }

      try {
        // Import the server action dynamically to avoid issues
        const { forgotPassword } = await import('@/app/forgot-password/actions')
        await forgotPassword(formData)
      } catch (error) {
        // Forgot password error
        window.location.href = '/forgot-password?error=An unexpected error occurred. Please try again.'
      }
    })
  }

  return (
    <div className="relative">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
          Reset Password
        </h1>
        <p className="text-white/80 animate-fade-in">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm animate-slide-down backdrop-blur-sm relative">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-100 px-4 py-3 rounded-xl text-sm animate-slide-down backdrop-blur-sm relative">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}
        
        <div className="space-y-5">
          {/* Email Field */}
          <div className="relative group">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={isPending}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`peer w-full px-4 py-3 pl-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                  focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                  backdrop-blur-sm transition-all duration-300 transform
                  ${focusedField === 'email' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                  ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="Email Address"
              />
              <label 
                htmlFor="email" 
                className={`absolute left-11 top-3 text-white/60 text-sm transition-all duration-300 pointer-events-none
                  peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/60
                  peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-orange-400
                  peer-focus:bg-brand-slate-800/80 peer-focus:px-2 peer-focus:rounded
                  peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 
                  peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-white/90
                  peer-[:not(:placeholder-shown)]:bg-brand-slate-800/80 peer-[:not(:placeholder-shown)]:px-2 
                  peer-[:not(:placeholder-shown)]:rounded`}
              >
                Email Address
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-brand-orange-400' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className={`w-full py-4 px-6 bg-gradient-to-r from-brand-orange-500/30 to-brand-orange-600/30 border border-white/30 text-white font-semibold rounded-xl
            backdrop-blur-sm transition-all duration-300 transform
            ${isPending 
              ? 'opacity-50 cursor-not-allowed scale-95' 
              : 'hover:from-brand-orange-400/40 hover:to-brand-orange-500/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-orange-500/25 focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 active:scale-[0.98]'
            }
            relative overflow-hidden group`}
        >
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <InlineLoading message="" />
            </div>
          )}
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <span className={`relative z-10 flex items-center justify-center ${isPending ? 'opacity-0' : 'opacity-100'}`}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Reset Link
          </span>
        </button>

        {/* Back to Login */}
        <div className="text-center pt-4">
          <p className="text-white/70 text-sm">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}