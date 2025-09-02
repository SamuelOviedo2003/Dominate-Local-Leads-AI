'use client'

import { useState, useEffect } from 'react'

interface LoginLogoProps {
  className?: string
}

// Use PNG logo for maximum reliability  
const LOGIN_LOGO_PATH = '/images/DominateLocalLeadsLogo.png'

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    console.error(`Failed to load login logo: ${LOGIN_LOGO_PATH}`)
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
    console.log(`Successfully loaded login logo: ${LOGIN_LOGO_PATH}`)
  }

  // Reset when component mounts
  useEffect(() => {
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
      <img
        src={LOGIN_LOGO_PATH}
        alt="Dominate Local Leads AI"
        width={400}
        height={96}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        style={{ maxHeight: '96px', width: 'auto' }}
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