'use client'

import { useState, useRef, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'

interface LoginFormProps {
  loginAction: (formData: FormData) => void
}

export default function LoginForm({ loginAction }: LoginFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      loginAction(formData)
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
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
      </div>
      
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
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <span className={`relative z-10 flex items-center justify-center ${isPending ? 'opacity-0' : 'opacity-100'}`}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign In to Continue
        </span>
      </button>

    </form>
  )
}