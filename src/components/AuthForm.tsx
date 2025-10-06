'use client'

import { useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { InlineLoading } from '@/components/LoadingSystem'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup' | 'forgot-password'

export default function AuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const success = searchParams.get('success')
  const initialMode = searchParams.get('mode') as AuthMode || 'login'
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleClientLogin = async (formData: FormData) => {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      setAuthError('Email and password are required')
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      // Step 1: Authenticate with Supabase
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      if (data.session) {
        console.log('[AUTH_FORM] Authentication successful, calling post-login endpoint')

        // Step 2: Use consolidated post-login endpoint (replaces 3 separate API calls)
        const response = await fetch('/api/auth/post-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          setAuthError(errorData.error || 'Login setup failed. Please try again.')
          return
        }

        const result = await response.json()

        if (result.success && result.redirectUrl) {
          // Prefetch the dashboard route before redirecting for faster perceived load
          router.prefetch(result.redirectUrl)
          router.push(result.redirectUrl)
        } else {
          setAuthError('Login setup failed. Please try again.')
        }
      }
    } catch (loginError) {
      console.error('[AUTH_FORM] Login error:', loginError)
      setAuthError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientSignup = async (formData: FormData) => {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!email || !password || !fullName || !confirmPassword) {
      setAuthError('All fields are required')
      return
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createClient()
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
        setAuthError(error.message)
        return
      }

      router.push('/login?success=Please check your email for confirmation link&mode=signup')
    } catch (signupError) {
      setAuthError('Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (formData: FormData) => {
    const email = formData.get('email') as string

    if (!email || !email.includes('@') || email.length < 5) {
      setAuthError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setAuthError(null)

    try {
      const supabase = createClient()

      // Detect current environment URL - use actual window.location.origin
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')

      // Use current origin if localhost, otherwise use production URL
      const siteUrl = isLocalhost
        ? currentOrigin // Use actual localhost URL with correct port
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://dominatelocalleadsai.sliplane.app')

      console.log('[FORGOT PASSWORD] Environment:', {
        isLocalhost,
        currentOrigin,
        siteUrl,
        redirectTo: `${siteUrl}/auth/reset-password`
      })

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`
      })

      if (error) {
        console.error('[FORGOT PASSWORD] Error:', error)
        // Show neutral message for security
        router.push('/login?success=If an account with that email exists, you will receive a password reset link&mode=login')
        return
      }

      console.log('[FORGOT PASSWORD] Success - Email sent to:', email)
      // Success - show neutral message
      router.push('/login?success=If an account with that email exists, you will receive a password reset link&mode=login')
    } catch (resetError) {
      console.error('[FORGOT PASSWORD] Unexpected error:', resetError)
      setAuthError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    if (authMode === 'login') {
      await handleClientLogin(formData)
    } else if (authMode === 'signup') {
      await handleClientSignup(formData)
    } else if (authMode === 'forgot-password') {
      await handleForgotPassword(formData)
    }
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
    setAuthError(null)
  }

  const switchToForgotPassword = () => {
    setAuthMode('forgot-password')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFocusedField(null)
    setAuthError(null)
  }

  return (
    <div className="relative">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
          {authMode === 'login' && 'Welcome Back'}
          {authMode === 'signup' && 'Create Account'}
          {authMode === 'forgot-password' && 'Reset Password'}
        </h1>
        <p className="text-white/80 animate-fade-in">
          {authMode === 'login' && 'Sign in to your account to continue'}
          {authMode === 'signup' && 'Join us to start dominating local leads'}
          {authMode === 'forgot-password' && 'Enter your email address and we\'ll send you a link to reset your password'}
        </p>
      </div>

      <form ref={formRef} onSubmit={async (e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        await handleSubmit(formData)
      }} className="space-y-6">
        {(error || authError) && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm animate-slide-down backdrop-blur-sm relative">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error || authError}</span>
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
                  disabled={isLoading}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'fullName' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
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
                disabled={isLoading}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`peer w-full px-4 py-3 pl-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                  focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                  backdrop-blur-sm transition-all duration-300 transform
                  ${focusedField === 'email' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
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

          {/* Password Field - Hidden for forgot password mode */}
          {authMode !== 'forgot-password' && (
            <div className="relative group">
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'password' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
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
                  disabled={isLoading}
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
          )}

          {/* Confirm Password Field - Only for Signup */}
          {authMode === 'signup' && (
            <div className="relative group">
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={`peer w-full px-4 py-3 pl-11 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                    focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                    backdrop-blur-sm transition-all duration-300 transform
                    ${focusedField === 'confirmPassword' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
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
                  disabled={isLoading}
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
          disabled={isLoading}
          className={`w-full py-4 px-6 bg-gradient-to-r from-brand-orange-500/30 to-brand-orange-600/30 border border-white/30 text-white font-semibold rounded-xl
            backdrop-blur-sm transition-all duration-300 transform
            ${isLoading 
              ? 'opacity-50 cursor-not-allowed scale-95' 
              : 'hover:from-brand-orange-400/40 hover:to-brand-orange-500/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-orange-500/25 focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 active:scale-[0.98]'
            }
            relative overflow-hidden group`}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <InlineLoading message="" />
            </div>
          )}
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          
          <span className={`relative z-10 flex items-center justify-center ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
            {authMode === 'login' && (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Continue
              </>
            )}
            {authMode === 'signup' && (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </>
            )}
            {authMode === 'forgot-password' && (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Reset Link
              </>
            )}
          </span>
        </button>

        {/* Mode Switch and Additional Links */}
        <div className="text-center pt-4 space-y-3">
          {/* Forgot Password Link - Only show in login mode */}
          {authMode === 'login' && (
            <div>
              <button
                type="button"
                onClick={switchToForgotPassword}
                disabled={isLoading}
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Mode Switch */}
          {authMode === 'login' && (
            <p className="text-white/70 text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={switchToSignup}
                disabled={isLoading}
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </p>
          )}

          {authMode === 'signup' && (
            <p className="text-white/70 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={switchToLogin}
                disabled={isLoading}
                className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back to Sign In
              </button>
            </p>
          )}

          {authMode === 'forgot-password' && (
            <p className="text-white/70 text-sm">
              Remember your password?{' '}
              <button
                type="button"
                onClick={switchToLogin}
                disabled={isLoading}
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