'use client'

import { useState, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { InlineLoading } from '@/components/LoadingSystem'

interface AuthFormProps {
  loginAction: (formData: FormData) => void
  signupAction: (formData: FormData) => void
}

type AuthMode = 'login' | 'signup'

export default function AuthForm({ loginAction, signupAction }: AuthFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')
  const initialMode = searchParams.get('mode') as AuthMode || 'login'
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      if (authMode === 'login') {
        loginAction(formData)
      } else if (authMode === 'signup') {
        signupAction(formData)
      }
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const switchToSignup = () => {
    setAuthMode('signup')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFocusedField(null)
  }

  const switchToLogin = () => {
    setAuthMode('login')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFocusedField(null)
  }

  return (
    <div className="relative">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
          {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-white/80 animate-fade-in">
          {authMode === 'login' 
            ? 'Sign in to your account to continue'
            : 'Join us to start dominating local leads'
          }
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
          {/* Full Name Field - Only for Signup */}
          {authMode === 'signup' && (
            <div className="relative group">
              <div className="relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  disabled={isPending}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'fullName' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Full Name"
                />
                <label 
                  htmlFor="fullName" 
                  className={`absolute left-11 top-3 text-white/60 text-sm transition-all duration-300 pointer-events-none
                    peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-white/60
                    peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-orange-400
                    peer-focus:bg-brand-slate-800/80 peer-focus:px-2 peer-focus:rounded
                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 
                    peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-white/90
                    peer-[:not(:placeholder-shown)]:bg-brand-slate-800/80 peer-[:not(:placeholder-shown)]:px-2 
                    peer-[:not(:placeholder-shown)]:rounded`}
                >
                  Full Name
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'fullName' ? 'text-brand-orange-400' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

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

          {/* Password Field */}
          <div className="relative group">
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
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
                placeholder="Password"
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
                Password
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
          </div>

          {/* Confirm Password Field - Only for Signup */}
          {authMode === 'signup' && (
            <div className="relative group">
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
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
            </div>
          )}
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
            {authMode === 'login' ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Continue
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </>
            )}
          </span>
        </button>

        {/* Mode Switch and Additional Links */}
        <div className="text-center pt-4 space-y-3">
          {/* Forgot Password Link - Only show in login mode */}
          {authMode === 'login' && (
            <div>
              <Link
                href="/forgot-password"
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current text-sm"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          {/* Mode Switch */}
          {authMode === 'login' ? (
            <p className="text-white/70 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={switchToSignup}
                disabled={isPending}
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-white/70 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={switchToLogin}
                disabled={isPending}
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </form>
    </div>
  )
}