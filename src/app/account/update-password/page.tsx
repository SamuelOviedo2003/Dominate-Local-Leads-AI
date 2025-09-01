'use client'

import { useState, useRef, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { updatePassword } from './actions'
import { InlineLoading, ComponentLoading } from '@/components/LoadingSystem'

/**
 * Password Update Form Component
 * Extracted to handle useSearchParams properly with Suspense
 */
function UpdatePasswordForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      updatePassword(formData)
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const isFormValid = password.length >= 6 && confirmPassword === password

  return (
    <div className="w-full max-w-md">
      {/* Glass Morphism Card */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-brand-orange-400/20 to-brand-orange-600/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            <svg className="w-8 h-8 text-brand-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
            Set New Password
          </h1>
          <p className="text-white/80 animate-fade-in">
            Create a secure password for your account
          </p>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm animate-slide-down backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-100 px-4 py-3 rounded-xl text-sm animate-slide-down backdrop-blur-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-5">
            {/* Password Field */}
            <div className="relative group">
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'password' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="New Password"
                />
                <label 
                  htmlFor="password" 
                  className={`absolute left-11 top-3 text-white/60 text-sm transition-all duration-300 pointer-events-none
                    peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/60
                    peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-orange-400
                    peer-focus:bg-brand-slate-800/80 peer-focus:px-2 peer-focus:rounded
                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 
                    peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-white/90
                    peer-[:not(:placeholder-shown)]:bg-brand-slate-800/80 peer-[:not(:placeholder-shown)]:px-2 
                    peer-[:not(:placeholder-shown)]:rounded`}
                >
                  New Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-brand-orange-400' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isPending}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 text-xs">
                  <div className="flex space-x-1">
                    <div className={`h-1 w-1/4 rounded-full transition-colors ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded-full transition-colors ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded-full transition-colors ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <p className="text-white/60 mt-1">
                    {password.length < 6 ? 'Password too short' : 
                     password.length < 8 ? 'Good password' : 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="relative group">
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'confirmPassword' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Confirm Password"
                />
                <label 
                  htmlFor="confirmPassword" 
                  className={`absolute left-11 top-3 text-white/60 text-sm transition-all duration-300 pointer-events-none
                    peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/60
                    peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-orange-400
                    peer-focus:bg-brand-slate-800/80 peer-focus:px-2 peer-focus:rounded
                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 
                    peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-white/90
                    peer-[:not(:placeholder-shown)]:bg-brand-slate-800/80 peer-[:not(:placeholder-shown)]:px-2 
                    peer-[:not(:placeholder-shown)]:rounded`}
                >
                  Confirm Password
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'confirmPassword' ? 'text-brand-orange-400' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  disabled={isPending}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password match indicator */}
              {confirmPassword && (
                <div className="mt-1 text-xs">
                  {password === confirmPassword ? (
                    <p className="text-green-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Passwords match
                    </p>
                  ) : (
                    <p className="text-red-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !isFormValid}
            className={`w-full py-4 px-6 bg-gradient-to-r from-brand-orange-500/30 to-brand-orange-600/30 border border-white/30 text-white font-semibold rounded-xl
              backdrop-blur-sm transition-all duration-300 transform
              ${isPending || !isFormValid
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Update Password
            </span>
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-4">
            <a
              href="/login"
              className="text-white/70 hover:text-white/90 text-sm transition-colors duration-300 underline decoration-transparent hover:decoration-current"
            >
              Back to Sign In
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Password Update Page
 * 
 * This page is accessed after users click the password reset link in their email.
 * It allows authenticated users to set a new password following email verification.
 */
export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-slate-900 via-brand-slate-800 to-brand-slate-900 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
            <div className="py-8">
              <ComponentLoading message="Loading password reset form..." />
            </div>
          </div>
        </div>
      }>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  )
}