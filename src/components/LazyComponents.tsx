/**
 * Lazy-loaded components for code splitting and performance optimization
 * Components are loaded only when needed, reducing initial bundle size
 */

import React, { lazy, Suspense, ComponentType } from 'react'
import { LoadingSystem } from './LoadingSystem'

// Lazy load heavy dashboard components
export const LazyPlatformSpendCard = lazy(() => 
  import('./features/dashboard/PlatformSpendCard').then(module => ({
    default: module.PlatformSpendCard
  }))
)

// Lazy load heavy lead components
export const LazyLeadsTable = lazy(() => 
  import('./features/leads/LeadsTable').then(module => ({
    default: module.LeadsTable
  }))
)

export const LazyAppointmentSetters = lazy(() => 
  import('./features/leads/AppointmentSetters').then(module => ({
    default: module.AppointmentSetters
  }))
)

export const LazyCommunicationsHistory = lazy(() => 
  import('./features/leads/CommunicationsHistory').then(module => ({
    default: module.CommunicationsHistory
  }))
)

export const LazyCallWindows = lazy(() => 
  import('./features/leads/CallWindows').then(module => ({
    default: module.CallWindows
  }))
)

// Chart components placeholder for future implementation
export const LazyRevenueChart = lazy(() => 
  Promise.resolve({
    default: () => <div className="text-gray-500 p-4">Chart component not implemented yet</div>
  })
)

// Lazy load demo/preview components (not essential for core functionality)
export const LazyMetallicTierDemo = lazy(() => 
  import('./ui/MetallicTierDemo')
)

export const LazyPremiumMetallicDemo = lazy(() => 
  import('./ui/PremiumMetallicDemo')
)

/**
 * Higher-order component for adding suspense boundaries
 */
interface WithSuspenseOptions {
  fallback?: React.ComponentType
  errorBoundary?: boolean
}

export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  options: WithSuspenseOptions = {}
) {
  const { fallback: Fallback = () => <LoadingSystem size="md" />, errorBoundary = false } = options

  const SuspenseWrapper = (props: P) => (
    <Suspense fallback={<Fallback />}>
      {errorBoundary ? (
        <ErrorBoundary>
          <Component {...props} />
        </ErrorBoundary>
      ) : (
        <Component {...props} />
      )}
    </Suspense>
  )

  // Copy display name for debugging
  SuspenseWrapper.displayName = `withSuspense(${Component.displayName || Component.name})`
  
  return SuspenseWrapper
}

/**
 * Simple error boundary for lazy-loaded components
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-medium mb-2">Component Error</h3>
          <p className="text-sm">This component failed to load. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Custom loading components for different contexts
 */
export const TableLoadingFallback = () => (
  <div className="animate-pulse">
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 border-b">
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const ChartLoadingFallback = () => (
  <div className="animate-pulse bg-white rounded-lg shadow-sm border p-4">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
)

export const CardLoadingFallback = () => (
  <div className="animate-pulse bg-white rounded-lg shadow-sm border p-4">
    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
  </div>
)

/**
 * Preload components for better UX
 * Call these functions to preload components before they're needed
 */
export const preloadComponents = {
  dashboard: () => {
    LazyPlatformSpendCard
    LazyRevenueChart
  },
  
  leads: () => {
    LazyLeadsTable
    LazyAppointmentSetters
  },
  
  leadDetails: () => {
    LazyCommunicationsHistory
    LazyCallWindows
  },
  
  demo: () => {
    LazyMetallicTierDemo
    LazyPremiumMetallicDemo
  }
}

/**
 * Bundle analysis helper - logs which components are being loaded
 * Useful for debugging and optimization
 */
export function trackComponentLoad(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.info(`📦 Lazy loaded: ${componentName}`)
  }
}

// Export commonly used combinations
export const SuspenseLeadsTable = withSuspense(LazyLeadsTable, {
  fallback: TableLoadingFallback
})

export const SuspensePlatformSpendCard = withSuspense(LazyPlatformSpendCard, {
  fallback: CardLoadingFallback
})

export const SuspenseCallWindows = withSuspense(LazyCallWindows, {
  fallback: () => <LoadingSystem size="md" message="Loading call data..." />
})