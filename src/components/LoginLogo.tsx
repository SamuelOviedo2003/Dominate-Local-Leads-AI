'use client'

import { useState } from 'react'

interface LoginLogoProps {
  className?: string
}

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleImageError = () => {
    console.warn('Failed to load logo image, showing fallback text')
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  // Fallback component with consistent styling
  if (imageError) {
    return (
      <div
        className={`${className} mx-auto flex items-center justify-center h-24 text-2xl font-bold text-blue-600 drop-shadow-2xl`}
        style={{
          maxHeight: '96px',
          width: 'auto',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
        }}
      >
        Dominate Local Leads AI
      </div>
    )
  }

  return (
    <img
      src="/images/DominateLocalLeadsLogoLogIn.webp"
      alt="Dominate Local Leads AI"
      className={`${className} mx-auto h-auto max-h-24 object-contain drop-shadow-2xl transition-opacity duration-300 ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        maxHeight: '96px', 
        width: 'auto',
        filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
      }}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  )
}