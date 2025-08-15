'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { ExtractedColors, extractColorsFromImage, getCachedColors } from '@/lib/color-extraction'

// Theme state interface
export interface DynamicThemeState {
  colors: ExtractedColors
  isLoading: boolean
  currentLogoUrl: string | null
  businessId: string | null
  error: string | null
}

// Theme actions
type ThemeAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_COLORS'; payload: { colors: ExtractedColors; logoUrl: string; businessId: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_THEME' }

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
  error: null
}

// Theme reducer
function themeReducer(state: DynamicThemeState, action: ThemeAction): DynamicThemeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    
    case 'SET_COLORS':
      return {
        ...state,
        colors: action.payload.colors,
        currentLogoUrl: action.payload.logoUrl,
        businessId: action.payload.businessId,
        isLoading: false,
        error: null
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        colors: DEFAULT_COLORS
      }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    case 'RESET_THEME':
      return {
        ...initialState,
        colors: DEFAULT_COLORS
      }
    
    default:
      return state
  }
}

// Context interfaces
interface DynamicThemeContextType {
  state: DynamicThemeState
  extractColors: (logoUrl: string, businessId: string) => Promise<void>
  resetTheme: () => void
  clearError: () => void
}

// Create context
const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined)

// Provider props
interface DynamicThemeProviderProps {
  children: ReactNode
}

// Theme provider component
export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
  const [state, dispatch] = useReducer(themeReducer, initialState)

  // Extract colors from logo URL
  const extractColors = async (logoUrl: string, businessId: string) => {
    console.log('[THEME DEBUG] Starting color extraction:', { logoUrl, businessId, currentLogoUrl: state.currentLogoUrl, currentBusinessId: state.businessId })
    
    try {
      // Skip if already processing the same logo and business
      if (state.currentLogoUrl === logoUrl && state.businessId === businessId && !state.error && !state.isLoading) {
        console.log('[THEME DEBUG] Skipping extraction - already processed:', { logoUrl, businessId })
        return
      }

      // Clear any previous errors when starting new extraction
      if (state.error) {
        dispatch({ type: 'CLEAR_ERROR' })
      }

      dispatch({ type: 'SET_LOADING', payload: true })
      console.log('[THEME DEBUG] Set loading state to true')

      // Check cache first
      const cachedColors = getCachedColors(logoUrl)
      if (cachedColors) {
        console.log('[THEME DEBUG] Using cached colors:', cachedColors)
        dispatch({ 
          type: 'SET_COLORS', 
          payload: { colors: cachedColors, logoUrl, businessId } 
        })
        return
      }

      console.log('[THEME DEBUG] Extracting colors from image...')
      
      // Extract colors from the image with timeout to prevent hanging
      const extractionPromise = extractColorsFromImage(logoUrl, {
        quality: 10,
        colorCount: 64,
        ignoreTransparent: true
      })

      // Add 5 second timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Color extraction timed out')), 5000)
      })

      const extractedColors = await Promise.race([extractionPromise, timeoutPromise])
      
      console.log('[THEME DEBUG] Colors extracted successfully:', extractedColors)

      // Double-check we're still dealing with the same business before applying colors
      // This prevents race conditions during rapid business switching
      if (businessId === state.businessId || state.businessId === null) {
        dispatch({ 
          type: 'SET_COLORS', 
          payload: { colors: extractedColors, logoUrl, businessId } 
        })
        console.log('[THEME DEBUG] Colors applied to theme state')
      } else {
        console.log('[THEME DEBUG] Skipping color application - business changed during extraction')
      }

    } catch (error) {
      console.error('[THEME DEBUG] Failed to extract colors:', error)
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Color extraction failed' 
      })
    }
  }

  // Reset theme to default
  const resetTheme = () => {
    dispatch({ type: 'RESET_THEME' })
  }

  // Clear error state
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

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
    clearError
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