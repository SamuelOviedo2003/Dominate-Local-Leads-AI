'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react'
import { 
  ExtractedColors, 
  extractColorsFromImage, 
  getCachedColors, 
  warmUpColorExtraction,
  cleanupColorExtraction,
  getColorExtractionStats 
} from '@/lib/color-extraction'

// Theme state interface
export interface DynamicThemeState {
  colors: ExtractedColors
  isLoading: boolean
  currentLogoUrl: string | null
  businessId: string | null
  error: string | null
  isInitialized: boolean
  extractionQueue: Set<string>
  lastExtractionTime: number | null
  metrics: {
    totalExtractions: number
    successfulExtractions: number
    cacheHits: number
    averageTime: number
  }
}

// Theme actions
type ThemeAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_COLORS'; payload: { colors: ExtractedColors; logoUrl: string; businessId: string; extractionTime?: number } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_THEME' }
  | { type: 'INITIALIZE' }
  | { type: 'ADD_TO_QUEUE'; payload: string }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'UPDATE_METRICS'; payload: { cacheHit: boolean; extractionTime: number } }

// Default fallback colors matching brand theme
const DEFAULT_COLORS: ExtractedColors = {
  primary: '#FF6B35',
  primaryDark: '#B23E1A', 
  primaryLight: '#FF9F66',
  accent: '#334155',
  textColor: '#FFFFFF',
  isLightLogo: false
}

const initialState: DynamicThemeState = {
  colors: DEFAULT_COLORS,
  isLoading: false,
  currentLogoUrl: null,
  businessId: null,
  error: null,
  isInitialized: false,
  extractionQueue: new Set(),
  lastExtractionTime: null,
  metrics: {
    totalExtractions: 0,
    successfulExtractions: 0,
    cacheHits: 0,
    averageTime: 0
  }
}

// Theme reducer
function themeReducer(state: DynamicThemeState, action: ThemeAction): DynamicThemeState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, isInitialized: true }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    
    case 'SET_COLORS':
      const newExtractionQueue = new Set(state.extractionQueue)
      newExtractionQueue.delete(action.payload.logoUrl)
      
      return {
        ...state,
        colors: action.payload.colors,
        currentLogoUrl: action.payload.logoUrl,
        businessId: action.payload.businessId,
        isLoading: false,
        error: null,
        extractionQueue: newExtractionQueue,
        lastExtractionTime: action.payload.extractionTime || Date.now(),
        metrics: {
          ...state.metrics,
          totalExtractions: state.metrics.totalExtractions + 1,
          successfulExtractions: state.metrics.successfulExtractions + 1,
          averageTime: action.payload.extractionTime 
            ? (state.metrics.averageTime * state.metrics.successfulExtractions + action.payload.extractionTime) / (state.metrics.successfulExtractions + 1)
            : state.metrics.averageTime
        }
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        colors: DEFAULT_COLORS,
        metrics: {
          ...state.metrics,
          totalExtractions: state.metrics.totalExtractions + 1
        }
      }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    case 'ADD_TO_QUEUE':
      const newQueue = new Set(state.extractionQueue)
      newQueue.add(action.payload)
      return { ...state, extractionQueue: newQueue }
    
    case 'REMOVE_FROM_QUEUE':
      const updatedQueue = new Set(state.extractionQueue)
      updatedQueue.delete(action.payload)
      return { ...state, extractionQueue: updatedQueue }
    
    case 'UPDATE_METRICS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          cacheHits: action.payload.cacheHit ? state.metrics.cacheHits + 1 : state.metrics.cacheHits,
          averageTime: (state.metrics.averageTime * state.metrics.totalExtractions + action.payload.extractionTime) / (state.metrics.totalExtractions + 1)
        }
      }
    
    case 'RESET_THEME':
      return {
        ...initialState,
        colors: DEFAULT_COLORS,
        isInitialized: state.isInitialized
      }
    
    default:
      return state
  }
}

// Context interfaces
interface DynamicThemeContextType {
  state: DynamicThemeState
  extractColors: (logoUrl: string, businessId: string, priority?: number) => Promise<void>
  resetTheme: () => void
  clearError: () => void
  getExtractionStats: () => any
  warmUp: (imageUrls?: string[]) => Promise<void>
  cleanup: () => void
}

// Create context
const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined)

// Provider props
interface DynamicThemeProviderProps {
  children: ReactNode
}

// Theme provider component
export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
  // Add safety check for React availability
  if (typeof React === 'undefined' || !React.useReducer) {
    // Fallback when React is not available
    return <>{children}</>
  }

  const [state, dispatch] = useReducer(themeReducer, initialState)

  // Initialize the color extraction system
  useEffect(() => {
    if (!state.isInitialized) {
      warmUpColorExtraction().then(() => {
        dispatch({ type: 'INITIALIZE' })
      }).catch(error => {
        dispatch({ type: 'INITIALIZE' }) // Initialize anyway
      })
    }

    // Cleanup on unmount
    return () => {
      if (state.isInitialized) {
        cleanupColorExtraction()
      }
    }
  }, [state.isInitialized])

  // Enhanced extract colors with performance optimization
  const extractColors = useCallback(async (logoUrl: string, businessId: string, priority: number = 0) => {
    const extractionKey = `${logoUrl}:${businessId}`
    const startTime = performance.now()
    
    
    try {
      // Skip if already processing the same logo and business and no errors
      if (state.currentLogoUrl === logoUrl && state.businessId === businessId && !state.error) {
        return
      }

      // Check if already in queue
      if (state.extractionQueue.has(extractionKey)) {
        return
      }

      // Add to queue
      dispatch({ type: 'ADD_TO_QUEUE', payload: extractionKey })

      // Clear any previous errors when starting new extraction
      if (state.error) {
        dispatch({ type: 'CLEAR_ERROR' })
      }

      dispatch({ type: 'SET_LOADING', payload: true })

      // Check cache first (optimized cache lookup)
      const cachedColors = await getCachedColors(logoUrl, businessId)
      if (cachedColors) {
        const extractionTime = performance.now() - startTime
        
        dispatch({ 
          type: 'SET_COLORS', 
          payload: { colors: cachedColors, logoUrl, businessId, extractionTime } 
        })
        
        dispatch({ 
          type: 'UPDATE_METRICS', 
          payload: { cacheHit: true, extractionTime } 
        })
        
        return
      }

      
      // Extract colors with enhanced options
      const extractedColors = await extractColorsFromImage(logoUrl, {
        quality: 10,
        colorCount: 64,
        ignoreTransparent: true,
        useWorker: true,
        priority,
        businessId
      })
      
      const extractionTime = performance.now() - startTime

      // Always apply colors from successful extraction
      // The extraction queue already handles preventing duplicate requests
      dispatch({ 
        type: 'SET_COLORS', 
        payload: { colors: extractedColors, logoUrl, businessId, extractionTime } 
      })

    } catch (error) {
      console.error('[THEME] Failed to extract colors:', error)
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Color extraction failed' 
      })
    } finally {
      // Remove from queue
      dispatch({ type: 'REMOVE_FROM_QUEUE', payload: extractionKey })
    }
  }, [state.currentLogoUrl, state.businessId, state.error, state.isLoading, state.extractionQueue])

  // Reset theme to default
  const resetTheme = useCallback(() => {
    dispatch({ type: 'RESET_THEME' })
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  // Get comprehensive extraction statistics
  const getExtractionStats = useCallback(() => {
    return {
      theme: state.metrics,
      system: getColorExtractionStats()
    }
  }, [state.metrics])

  // Warm up system with optional image URLs
  const warmUp = useCallback(async (imageUrls: string[] = []) => {
    try {
      await warmUpColorExtraction(imageUrls)
    } catch (error) {
    }
  }, [])

  // Cleanup system resources
  const cleanup = useCallback(() => {
    cleanupColorExtraction()
  }, [])

  // Apply CSS custom properties for dynamic theming
  useEffect(() => {
    const root = document.documentElement
    const { colors } = state

    // Set CSS custom properties
    root.style.setProperty('--dynamic-primary', colors.primary)
    root.style.setProperty('--dynamic-primary-dark', colors.primaryDark)
    root.style.setProperty('--dynamic-primary-light', colors.primaryLight)
    root.style.setProperty('--dynamic-accent', colors.accent)
    root.style.setProperty('--dynamic-text', colors.textColor)
    root.style.setProperty('--dynamic-is-light', colors.isLightLogo ? '1' : '0')

    // Add transition class to body for smooth color changes
    document.body.classList.add('dynamic-theme-transition')

    return () => {
      // Clean up transition class
      document.body.classList.remove('dynamic-theme-transition')
    }
  }, [state.colors])

  const contextValue: DynamicThemeContextType = {
    state,
    extractColors,
    resetTheme,
    clearError,
    getExtractionStats,
    warmUp,
    cleanup
  }

  return (
    <DynamicThemeContext.Provider value={contextValue}>
      {children}
    </DynamicThemeContext.Provider>
  )
}

// Custom hook to use the dynamic theme context
export function useDynamicTheme() {
  const context = useContext(DynamicThemeContext)
  if (context === undefined) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider')
  }
  return context
}

// Hook for getting theme-aware styles
export function useThemeStyles() {
  const { state } = useDynamicTheme()
  
  return {
    // Header gradient using dynamic colors
    headerGradient: `linear-gradient(to right, ${state.colors.primaryDark}e6, ${state.colors.accent}e6, ${state.colors.primary}e6)`,
    
    // Background colors
    primaryBg: state.colors.primary,
    primaryDarkBg: state.colors.primaryDark,
    primaryLightBg: state.colors.primaryLight,
    accentBg: state.colors.accent,
    
    // Text colors
    textColor: state.colors.textColor,
    
    // Utility classes for Tailwind arbitrary values
    dynamicPrimary: `[background-color:${state.colors.primary}]`,
    dynamicPrimaryDark: `[background-color:${state.colors.primaryDark}]`,
    dynamicPrimaryLight: `[background-color:${state.colors.primaryLight}]`,
    dynamicAccent: `[background-color:${state.colors.accent}]`,
    dynamicText: `[color:${state.colors.textColor}]`,
    
    // For gradients with arbitrary values
    dynamicHeaderGradient: `[background-image:linear-gradient(to_right,${state.colors.primaryDark.replace('#', '')}e6,${state.colors.accent.replace('#', '')}e6,${state.colors.primary.replace('#', '')}e6)]`,
    
    // CSS custom property references for use in Tailwind
    cssVars: {
      '--dynamic-primary': state.colors.primary,
      '--dynamic-primary-dark': state.colors.primaryDark,
      '--dynamic-primary-light': state.colors.primaryLight,
      '--dynamic-accent': state.colors.accent,
      '--dynamic-text': state.colors.textColor
    }
  }
}

// Utility function to get dynamic Tailwind classes
export function getDynamicClasses(colors: ExtractedColors) {
  return {
    headerBg: `bg-gradient-to-r from-[${colors.primaryDark}]/90 via-[${colors.accent}]/90 to-[${colors.primary}]/90`,
    primaryButton: `bg-[${colors.primary}] hover:bg-[${colors.primaryDark}] text-[${colors.textColor}]`,
    accentButton: `bg-[${colors.accent}] hover:bg-[${colors.primaryDark}] text-[${colors.textColor}]`,
    textColor: `text-[${colors.textColor}]`,
    borderColor: `border-[${colors.primary}]/20`
  }
}