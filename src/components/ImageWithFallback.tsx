'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ExtractedColors } from '@/lib/color-extraction'

interface ImageWithFallbackProps {
  src: string
  alt: string
  className?: string
  fallbackBehavior?: 'hide' | 'placeholder'
  fallbackText?: string
  onColorsExtracted?: (colors: ExtractedColors) => void
  extractColors?: boolean
  businessId?: string
  priority?: number
  lazy?: boolean
  sizes?: string
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackBehavior = 'hide',
  fallbackText = 'Image not available',
  onColorsExtracted,
  extractColors = false,
  businessId,
  priority = 0,
  lazy = true,
  sizes,
  onLoadStart,
  onLoadComplete,
  onError
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(!lazy)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const lastExtractedSrc = useRef<string>('')
  const extractionAbortController = useRef<AbortController | null>(null)
  
  // For now, disable theme extraction to avoid context issues
  // This component is used outside the dashboard where DynamicThemeProvider is not available
  const themeExtractColors = null

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          setIsIntersecting(true)
          observerRef.current?.disconnect()
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [lazy])

  const handleError = useCallback((event: any) => {
    console.warn('[IMAGE] Load error for:', src, event)
    setHasError(true)
    setIsLoading(false)
    lastExtractedSrc.current = ''
    
    const error = new Error(`Failed to load image: ${src}`)
    onError?.(error)
  }, [src, onError])

  const handleLoadStart = useCallback(() => {
    setIsLoading(true)
    onLoadStart?.()
  }, [onLoadStart])

  const handleLoad = useCallback(async () => {
    setIsLoading(false)
    setHasError(false)
    onLoadComplete?.()

    // Only extract colors if requested and we haven't already extracted for this src
    if (extractColors && src !== lastExtractedSrc.current && !hasError && businessId) {
      setIsExtracting(true)
      lastExtractedSrc.current = src

      // Cancel previous extraction if still running
      if (extractionAbortController.current) {
        extractionAbortController.current.abort()
      }
      
      extractionAbortController.current = new AbortController()

      try {
        console.log('[IMAGE] Starting color extraction for:', src)
        
        // Color extraction will be handled by the theme context automatically
        console.debug('[IMAGE] Color extraction handled by theme context')
        
        console.log('[IMAGE] Color extraction completed for:', src)
        
        // If there's a callback, we could call it here, but the theme context
        // already handles the color application
        
      } catch (error) {
        console.warn('[IMAGE] Failed to extract colors from image:', error)
        onError?.(error as Error)
      } finally {
        setIsExtracting(false)
        extractionAbortController.current = null
      }
    }
  }, [extractColors, src, hasError, businessId, priority, themeExtractColors, onLoadComplete, onError])

  // Reset states when src changes
  useEffect(() => {
    setHasError(false)
    setIsLoading(true)
    setIsExtracting(false)
    lastExtractedSrc.current = ''
    
    // Cancel any ongoing extraction
    if (extractionAbortController.current) {
      extractionAbortController.current.abort()
      extractionAbortController.current = null
    }
  }, [src])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      if (extractionAbortController.current) {
        extractionAbortController.current.abort()
      }
    }
  }, [])

  if (hasError && fallbackBehavior === 'hide') {
    return null
  }

  if (hasError && fallbackBehavior === 'placeholder') {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}>
        <span className="text-sm">{fallbackText}</span>
      </div>
    )
  }

  // Don't render image until it's in viewport (for lazy loading)
  if (lazy && !isIntersecting) {
    return (
      <div 
        ref={imgRef}
        className={`bg-gray-100 animate-pulse ${className}`}
        style={{ aspectRatio: '16/9' }} // Default aspect ratio
      />
    )
  }

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={isIntersecting ? src : undefined}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        crossOrigin="anonymous" // Required for color extraction
        loading={lazy ? "lazy" : "eager"}
        sizes={sizes}
        style={{ 
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
      
      {/* Loading placeholder */}
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-100 animate-pulse ${className}`} />
      )}
      
      {/* Color extraction indicator */}
      {isExtracting && extractColors && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[0.5px] pointer-events-none">
          <div className="relative">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      )}
      
      {/* Priority indicator (for development) */}
      {process.env.NODE_ENV === 'development' && priority > 0 && (
        <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">
          P{priority}
        </div>
      )}
    </div>
  )
}