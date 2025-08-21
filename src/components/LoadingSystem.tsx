'use client'

import { memo, useEffect, useState } from 'react'

interface LoadingSystemProps {
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg'
  /** Loading message to display */
  message?: string
  /** Full screen loading (centers in viewport) */
  fullScreen?: boolean
  /** Custom className for additional styling */
  className?: string
}

function LoadingSystemComponent({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false,
  className = ''
}: LoadingSystemProps) {
  // Size configurations for the simple spinner
  const sizeConfig = {
    sm: {
      spinner: 'w-6 h-6',
      border: 'border-2',
      text: 'text-sm',
      spacing: 'space-y-2'
    },
    md: {
      spinner: 'w-8 h-8',
      border: 'border-2',
      text: 'text-base',
      spacing: 'space-y-3'
    },
    lg: {
      spinner: 'w-12 h-12',
      border: 'border-4',
      text: 'text-lg',
      spacing: 'space-y-4'
    }
  }

  const config = sizeConfig[size]
  
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`flex flex-col items-center ${config.spacing}`}>
        {/* Simple Spinning Circle Loader */}
        <div 
          className={`
            ${config.spinner} 
            ${config.border}
            border-purple-200 
            border-t-purple-600 
            rounded-full 
            animate-spin-smooth
          `}
          aria-hidden="true"
        />

        {/* Loading Message */}
        {message && (
          <div className={`${config.text} font-medium text-gray-700 text-center`}>
            {message}
          </div>
        )}
        
        {/* Accessibility */}
        <div className="sr-only" aria-live="polite" role="status">
          Loading content, please wait...
        </div>
      </div>
    </div>
  )
}

// Add prefers-reduced-motion support
const LoadingSystemWithReducedMotion = memo((props: LoadingSystemProps) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  // If user prefers reduced motion, show simple static indicator
  if (prefersReducedMotion) {
    const { size = 'md', message = 'Loading...', fullScreen = false, className = '' } = props
    const sizeConfig = {
      sm: { text: 'text-sm', spacing: 'space-y-2', spinner: 'w-6 h-6' },
      md: { text: 'text-base', spacing: 'space-y-3', spinner: 'w-8 h-8' },
      lg: { text: 'text-lg', spacing: 'space-y-4', spinner: 'w-12 h-12' }
    }
    const config = sizeConfig[size]
    const containerClasses = fullScreen 
      ? 'fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50'
      : 'flex items-center justify-center'
      
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className={`flex flex-col items-center ${config.spacing}`}>
          <div className={`${config.spinner} bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center`}>
            <div className="w-1/2 h-1/2 bg-white rounded-full" />
          </div>
          {message && (
            <div className={`${config.text} font-medium text-gray-700 text-center`}>
              {message}
            </div>
          )}
          <div className="sr-only" aria-live="polite" role="status">
            Loading content, please wait...
          </div>
        </div>
      </div>
    )
  }
  
  return <LoadingSystemComponent {...props} />
})

// Memoized component for performance
export const LoadingSystem = memo(LoadingSystemWithReducedMotion)

// Legacy export for backward compatibility
export const Spinner = LoadingSystem

// Preset components for common use cases
export const PageLoading = memo(({ message = 'Loading page...' }: { message?: string }) => (
  <LoadingSystem size="lg" message={message} fullScreen />
))

export const ComponentLoading = memo(({ message = 'Loading data...' }: { message?: string }) => (
  <LoadingSystem size="md" message={message} />
))

export const InlineLoading = memo(({ message = 'Loading...' }: { message?: string }) => (
  <LoadingSystem size="sm" message={message} />
))

// Enhanced skeleton loading for tables and lists
export const TableSkeleton = memo(({ count = 1 }: { count?: number }) => (
  <div className="space-y-4 p-6">
    <div className="flex items-center justify-center py-8">
      <LoadingSystem size="md" message="Loading table data..." />
    </div>
  </div>
))

// Enhanced skeleton for metrics and components
export const CardSkeleton = memo(({ count = 1 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin-smooth" />
        </div>
      </div>
    ))}
  </div>
))

export default LoadingSystem