'use client'

import { useState, useEffect, useRef } from 'react'

interface LoginLogoProps {
  className?: string
}

// Primary logo path
const LOGIN_LOGO_PATH = '/images/DominateLocalLeadsLogo.png'

// Fallback paths to try if primary fails
const FALLBACK_PATHS = [
  '/images/DominateLocalLeadsLogoLogIn.webp',
  '/images/noIMAGE.png'
]

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState(LOGIN_LOGO_PATH)
  const [retryCount, setRetryCount] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleError = () => {
    console.warn(`Failed to load logo: ${currentPath} (attempt ${retryCount + 1})`)
    
    // Try fallback images before showing text fallback
    if (retryCount < FALLBACK_PATHS.length) {
      const nextPath = FALLBACK_PATHS[retryCount]
      if (nextPath) {
        console.log(`Trying fallback logo: ${nextPath}`)
        setCurrentPath(nextPath)
        setRetryCount(prev => prev + 1)
        setIsLoading(true)
        return
      }
    }
    
    // All attempts failed, show text fallback
    console.error(`All logo loading attempts failed. Showing text fallback.`)
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
    console.log(`Successfully loaded logo: ${currentPath}`)
  }

  // Check if image is already loaded when component mounts or path changes
  useEffect(() => {
    const checkImageLoaded = () => {
      const img = imgRef.current
      if (img && img.complete && img.naturalWidth > 0) {
        // Image is already loaded
        handleLoad()
      }
    }

    setHasError(false)
    setIsLoading(true)
    setCurrentPath(LOGIN_LOGO_PATH)
    setRetryCount(0)

    // Check after a brief delay to ensure the img element is rendered
    const timer = setTimeout(checkImageLoaded, 100)
    return () => clearTimeout(timer)
  }, [])

  // Enhanced text fallback with better styling
  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className} mx-auto max-h-24`}>
        <div className="text-center px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
          <div className="text-white text-xl font-bold tracking-wide mb-2">
            Dominate Local Leads AI
          </div>
          <div className="text-white/80 text-sm font-medium">
            Lead Management System
          </div>
          {/* Decorative element */}
          <div className="mt-3 mx-auto w-16 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      <img
        ref={imgRef}
        src={currentPath}
        alt="Dominate Local Leads AI"
        width={400}
        height={96}
        className={`${className} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
        style={{ 
          maxHeight: '96px', 
          width: 'auto',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
        }}
      />
      
      {/* Loading indicator with better styling */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-lg">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
            <div className="text-white/80 text-xs font-medium">Loading logo...</div>
          </div>
        </div>
      )}
    </div>
  )
}