'use client'

import { useState } from 'react'

interface LoginLogoProps {
  className?: string
}

export default function LoginLogo({ }: LoginLogoProps) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  // Fallback component with consistent styling
  if (imageError) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-2xl tracking-tight">
            Jenn's Roofing
          </h1>
          <p className="text-white/70 text-sm mt-2">Professional Roofing Services</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[120px]">
      <img
        src="/images/jennsLogo.png"
        alt="Jenn's Roofing"
        className="mx-auto object-contain"
        style={{
          maxHeight: '120px',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto'
        }}
        onError={handleImageError}
        loading="eager"
      />
    </div>
  )
}