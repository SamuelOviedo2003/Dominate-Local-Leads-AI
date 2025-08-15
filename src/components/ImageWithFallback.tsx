'use client'

import { useState, useRef, useEffect } from 'react'
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
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackBehavior = 'hide',
  fallbackText = 'Image not available',
  onColorsExtracted,
  extractColors = false,
  businessId
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const lastExtractedSrc = useRef<string>('')

  const handleError = () => {
    setHasError(true)
    lastExtractedSrc.current = ''
  }

  const handleLoad = async () => {
    // Only extract colors if requested and we haven't already extracted for this src
    if (extractColors && onColorsExtracted && src !== lastExtractedSrc.current && !hasError) {
      setIsExtracting(true)
      lastExtractedSrc.current = src

      try {
        // Dynamic import to avoid loading the library unless needed
        const { extractColorsFromImage } = await import('@/lib/color-extraction')
        
        const colors = await extractColorsFromImage(src, {
          quality: 10,
          colorCount: 64,
          ignoreTransparent: true
        })

        onColorsExtracted(colors)
      } catch (error) {
        console.warn('Failed to extract colors from image:', error)
        // Don't call onColorsExtracted on error to allow fallback handling
      } finally {
        setIsExtracting(false)
      }
    }
  }

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false)
    setIsExtracting(false)
  }, [src])

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

  return (
    <div className="relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        crossOrigin="anonymous" // Required for color extraction
      />
      
      {/* Optional loading indicator for color extraction */}
      {isExtracting && extractColors && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-full pointer-events-none">
          <div className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}