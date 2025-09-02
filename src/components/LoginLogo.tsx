'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface LoginLogoProps {
  className?: string
}

const LOGO_SOURCES = [
  '/images/DominateLocalLeadsLogoLogIn.webp',
  '/images/DominateLocalLeadsLogo.png', 
  '/images/DominateLocalLeadsLogo.webp'
]

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentLogo: string = LOGO_SOURCES[currentLogoIndex] || LOGO_SOURCES[0]!

  const handleError = () => {
    console.warn(`Failed to load logo: ${currentLogo}`)
    
    // Try next logo source
    if (currentLogoIndex < LOGO_SOURCES.length - 1) {
      setCurrentLogoIndex(prevIndex => prevIndex + 1)
      setIsLoading(true)
      setHasError(false)
    } else {
      // All logo sources failed
      console.error('All logo sources failed to load')
      setHasError(true)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
    console.log(`Successfully loaded logo: ${currentLogo}`)
  }

  // Reset when component mounts
  useEffect(() => {
    setCurrentLogoIndex(0)
    setHasError(false)
    setIsLoading(true)
  }, [])

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className} mx-auto max-h-24`}>
        <div className="text-center">
          <div className="text-white text-xl font-bold">
            Dominate Local Leads AI
          </div>
          <div className="text-white/70 text-sm mt-1">
            Lead Management System
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Image
        src={currentLogo}
        alt="Dominate Local Leads AI"
        width={400}
        height={96}
        priority
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={currentLogo.includes('webp')} // Disable optimization for WebP to avoid potential issues
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 backdrop-blur-sm rounded">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}