'use client'

import { memo } from 'react'

interface SpinnerProps {
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg'
  /** Loading message to display */
  message?: string
  /** Full screen loading (centers in viewport) */
  fullScreen?: boolean
  /** Custom className for additional styling */
  className?: string
  /** Color variant for the spinner */
  color?: 'primary' | 'secondary' | 'accent'
}

function SpinnerComponent({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false,
  className = '',
  color = 'primary'
}: SpinnerProps) {
  
  // Size configurations
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
      border: 'border-3',
      text: 'text-lg',
      spacing: 'space-y-4'
    }
  }

  // Color configurations
  const colorConfig = {
    primary: 'border-purple-200 border-t-purple-600',
    secondary: 'border-gray-200 border-t-gray-600',
    accent: 'border-blue-200 border-t-blue-600'
  }

  const config = sizeConfig[size]
  const colors = colorConfig[color]
  
  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`flex flex-col items-center ${config.spacing}`}>
        {/* Simple Spinning Circle */}
        <div 
          className={`${config.spinner} ${config.border} ${colors} rounded-full animate-spin`}
          style={{
            animationDuration: '1s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite'
          }}
          aria-label="Loading"
          role="status"
        />

        {/* Loading Message */}
        {message && (
          <div className={`${config.text} font-medium text-gray-700`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

// Memoized component for performance
export const Spinner = memo(SpinnerComponent)

// Legacy export for backward compatibility
export const LoadingSystem = Spinner

// Preset components for common use cases
export const PageLoading = memo(({ message = 'Loading page...' }: { message?: string }) => (
  <Spinner size="lg" message={message} fullScreen />
))

export const ComponentLoading = memo(({ message = 'Loading...' }: { message?: string }) => (
  <Spinner size="md" message={message} />
))

export const InlineLoading = memo(({ message = 'Loading...' }: { message?: string }) => (
  <Spinner size="sm" message={message} />
))

// Simple skeleton loading for tables and lists
export const TableSkeleton = memo(({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4 p-6">
    <div className="flex items-center justify-center py-8">
      <Spinner size="md" message="Loading table data..." />
    </div>
  </div>
))

// Simple skeleton for metrics and components
export const CardSkeleton = memo(({ count = 4 }: { count?: number }) => (
  <div className="flex items-center justify-center py-12">
    <Spinner size="md" message="Loading data..." />
  </div>
))

export default Spinner