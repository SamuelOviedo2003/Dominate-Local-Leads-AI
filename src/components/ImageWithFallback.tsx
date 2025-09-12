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
  const [currentSrc, setCurrentSrc] = useState(src)
  const [retryAttempt, setRetryAttempt] = useState(0)
  
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
    const errorDetails = {
      src: currentSrc,
      originalSrc: src,
      retryAttempt,
      error: event?.error || 'Unknown error',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      timestamp: new Date().toISOString(),
      referrer: typeof window !== 'undefined' ? window.document.referrer : 'Unknown'
    }
    
    
    // Try image proxy as fallback for external images (Google Maps, etc.)
    const isExternalImage = src.includes('maps.googleapis.com') || src.includes('maps.google.com')
    const isDirectLoad = currentSrc === src
    
    if (isExternalImage && isDirectLoad && retryAttempt === 0) {
      const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`
      setCurrentSrc(proxiedUrl)
      setRetryAttempt(1)
      setIsLoading(true)
      return // Don't set error yet, try proxy first
    }
    
    // Additional logging for Google Maps API images
    if (src.includes('maps.googleapis.com')) {
      // Google Maps API image failed to load after all attempts
    }
    
    setHasError(true)
    setIsLoading(false)
    lastExtractedSrc.current = ''
    
    const error = new Error(`Failed to load image after ${retryAttempt + 1} attempts: ${src}`)
    onError?.(error)
  }, [src, currentSrc, retryAttempt, onError])

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
        // Color extraction will be handled by the theme context automatically
        
        // If there's a callback, we could call it here, but the theme context
        // already handles the color application
        
      } catch (error) {
        // Failed to extract colors from image
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
    setCurrentSrc(src)
    setRetryAttempt(0)
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
      <div className={`flex flex-col items-center justify-center bg-gray-200 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">{fallbackText}</span>
        {process.env.NODE_ENV === 'development' && (
          <span className="text-xs text-gray-400 mt-1 text-center px-2">
            Failed to load: {src.length > 50 ? `${src.substring(0, 50)}...` : src}
          </span>
        )}
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
        src={isIntersecting ? currentSrc : undefined}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        crossOrigin={currentSrc.includes('maps.googleapis.com') ? undefined : "anonymous"} // Skip CORS for Google Maps to avoid issues
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