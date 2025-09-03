'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { InlineLoading } from '@/components/LoadingSystem'

/**
 * Reset Password Form Component
 * 
 * Handles the complete password reset flow:
 * 1. Extracts code from URL params
 * 2. Exchanges code for session using exchangeCodeForSession
 * 3. Shows password update form
 * 4. Updates password using updateUser
 * 5. Redirects to dashboard on success
 */
export default function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [sessionEstablished, setSessionEstablished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Extract code from URL and exchange for session
  useEffect(() => {
    const handleCodeExchange = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get code from search params
        const code = searchParams.get('code')
        
        console.log('=== RESET PASSWORD FORM DEBUG ===')
        console.log('Code from URL:', code ? 'Present' : 'Not found')
        console.log('Full search params:', Array.from(searchParams.entries()))
        
        if (!code) {
          console.error('No code found in URL parameters')
          setError('Invalid reset link. The link may be expired or malformed.')
          setLoading(false)
          return
        }

        console.log('Attempting code exchange for session...')
        
        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        console.log('Exchange result:', { 
          user: data?.user?.id || 'No user',
          session: data?.session ? 'Session created' : 'No session',
          error: exchangeError?.message || 'None'
        })

        if (exchangeError) {
          console.error('Code exchange failed:', exchangeError)
          
          // Handle specific error cases
          if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid')) {
            setError('This password reset link has expired or is invalid. Please request a new one.')
          } else if (exchangeError.message.includes('already')) {
            setError('This password reset link has already been used. Please request a new one if needed.')
          } else {
            setError('Unable to verify your password reset link. Please try requesting a new one.')
          }
          setLoading(false)
          return
        }

        if (!data.user || !data.session) {
          console.error('No user or session returned from code exchange')
          setError('Authentication failed. Please request a new password reset link.')
          setLoading(false)
          return
        }

        console.log('✅ Code exchange successful, session established')
        setSessionEstablished(true)
        setLoading(false)
        
      } catch (error) {
        console.error('Unexpected error during code exchange:', error)
        setError('An unexpected error occurred. Please try again.')
        setLoading(false)
      }
    }

    // Also check if user is already authenticated via fragment/hash (SDK auto-signin)
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('✅ User already authenticated via SDK')
          setSessionEstablished(true)
          setLoading(false)
          return true
        }
        return false
      } catch (error) {
        console.error('Error checking existing session:', error)
        return false
      }
    }

    // First check for existing session, then try code exchange
    checkExistingSession().then((hasSession) => {
      if (!hasSession) {
        handleCodeExchange()
      }
    })
  }, [searchParams, supabase.auth])

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 12.5
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5
    return Math.min(100, strength)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setPasswordStrength(calculatePasswordStrength(password))
  }

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 25) return 'bg-red-500'
    if (strength < 50) return 'bg-yellow-500'
    if (strength < 75) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 25) return 'Very Weak'
    if (strength < 50) return 'Weak'
    if (strength < 75) return 'Good'
    return 'Strong'
  }

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        setError(null)
        setSuccess(null)
        
        const newPassword = formData.get('newPassword') as string
        const confirmPassword = formData.get('confirmPassword') as string

        // Client-side validation
        if (!newPassword || newPassword.length < 8) {
          setError('Password must be at least 8 characters long')
          return
        }

        if (newPassword !== confirmPassword) {
          setError('Passwords do not match')
          return
        }

        if (passwordStrength < 50) {
          setError('Please choose a stronger password')
          return
        }

        console.log('Updating password...')
        
        // Update the user's password
        const { data, error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (updateError) {
          console.error('Password update failed:', updateError)
          setError('Failed to update password. Please try again.')
          return
        }

        if (!data.user) {
          console.error('No user returned from password update')
          setError('Failed to update password. Please try again.')
          return
        }

        console.log('✅ Password updated successfully')
        setSuccess('Password updated successfully! Redirecting to dashboard...')
        
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
        
      } catch (error) {
        console.error('Unexpected error during password update:', error)
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  // Loading state
  if (loading) {
    return (
      <div className="relative">
        <div className="text-center py-8">
          <InlineLoading message="Verifying reset link..." />
        </div>
      </div>
    )
  }

  // Error state (invalid/expired link)
  if (error && !sessionEstablished) {
    return (
      <div className="relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
            Reset Link Invalid
          </h1>
          <p className="text-white/80 animate-fade-in">
            This password reset link is no longer valid
          </p>
        </div>

        <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm backdrop-blur-sm mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/forgot-password"
            className="w-full py-4 px-6 bg-gradient-to-r from-brand-orange-500/30 to-brand-orange-600/30 border border-white/30 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 transform hover:from-brand-orange-400/40 hover:to-brand-orange-500/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-orange-500/25 focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 active:scale-[0.98] relative overflow-hidden group flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Request New Reset Link
          </Link>

          <div className="text-center">
            <Link
              href="/login"
              className="text-brand-orange-400 hover:text-brand-orange-300 font-medium transition-colors duration-300 underline decoration-transparent hover:decoration-current"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Password update form (when session is established)
  return (
    <div className="relative">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 animate-slide-up">
          Set New Password
        </h1>
        <p className="text-white/80 animate-fade-in">
          Choose a strong password for your account
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
          {/* New Password Field */}
          <div className="relative group">
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isPending}
                onChange={handlePasswordChange}
                onFocus={() => setFocusedField('newPassword')}
                onBlur={() => setFocusedField(null)}
                className={`peer w-full px-4 py-3 pl-11 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-transparent 
                  focus:outline-none focus:ring-2 focus:ring-brand-orange-400/50 focus:border-brand-orange-400/50 focus:bg-white/15
                  backdrop-blur-sm transition-all duration-300 transform
                  ${focusedField === 'newPassword' ? 'scale-[1.02] shadow-lg shadow-brand-orange-500/20' : ''}
                  ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder="New Password"
              />
              <label 
                htmlFor="newPassword" 
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
                <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'newPassword' ? 'text-brand-orange-400' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Password Strength Indicator */}
            {passwordStrength > 0 && (
              <div className="mt-2 px-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">Password Strength</span>
                  <span className="text-xs text-white/80">{getPasswordStrengthText(passwordStrength)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  ></div>
                </div>
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
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || passwordStrength < 50}
          className={`w-full py-4 px-6 bg-gradient-to-r from-brand-orange-500/30 to-brand-orange-600/30 border border-white/30 text-white font-semibold rounded-xl
            backdrop-blur-sm transition-all duration-300 transform
            ${isPending || passwordStrength < 50
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