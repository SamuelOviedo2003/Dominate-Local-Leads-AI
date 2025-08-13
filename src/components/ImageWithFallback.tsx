'use client'

import { useState } from 'react'

interface ImageWithFallbackProps {
  src: string
  alt: string
  className?: string
  fallbackBehavior?: 'hide' | 'placeholder'
  fallbackText?: string
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackBehavior = 'hide',
  fallbackText = 'Image not available'
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
  }

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
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}