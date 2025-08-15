'use client'

export interface ExtractedColors {
  primary: string
  primaryDark: string
  primaryLight: string
  accent: string
  textColor: string
  isLightLogo: boolean
}

export interface ColorExtractionOptions {
  quality?: number
  colorCount?: number
  ignoreTransparent?: boolean
}

// Cache for extracted colors to avoid repeated processing
const colorCache = new Map<string, ExtractedColors>()

// Fallback brand colors
const FALLBACK_COLORS: ExtractedColors = {
  primary: '#FF6B35',
  primaryDark: '#B23E1A',
  primaryLight: '#FF9F66',
  accent: '#334155',
  textColor: '#FFFFFF',
  isLightLogo: false
}

/**
 * Calculates relative luminance of a color
 * Used for determining if a color is light or dark
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const { r, g, b } = rgb
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0)
}

/**
 * Converts hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1] || '0', 16),
    g: parseInt(result[2] || '0', 16),
    b: parseInt(result[3] || '0', 16)
  } : null
}

/**
 * Calculates contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Generates a darker variant of a color
 */
function darkenColor(hex: string, amount: number = 0.3): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const { r, g, b } = rgb
  const newR = Math.max(0, Math.floor(r * (1 - amount)))
  const newG = Math.max(0, Math.floor(g * (1 - amount)))
  const newB = Math.max(0, Math.floor(b * (1 - amount)))

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Generates a lighter variant of a color
 */
function lightenColor(hex: string, amount: number = 0.3): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const { r, g, b } = rgb
  const newR = Math.min(255, Math.floor(r + (255 - r) * amount))
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount))
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount))

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Determines appropriate text color based on background color for WCAG compliance
 */
function getAccessibleTextColor(backgroundColor: string): string {
  const contrastWithWhite = getContrastRatio(backgroundColor, '#FFFFFF')
  const contrastWithBlack = getContrastRatio(backgroundColor, '#000000')
  
  // Use white text if contrast ratio is >= 4.5, otherwise use black
  return contrastWithWhite >= 4.5 ? '#FFFFFF' : '#000000'
}

/**
 * Converts RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Creates an image element for color extraction
 */
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Extracts colors from an image URL and returns a cohesive color palette
 */
export async function extractColorsFromImage(
  imageUrl: string, 
  options: ColorExtractionOptions = {}
): Promise<ExtractedColors> {
  try {
    // Check cache first
    if (colorCache.has(imageUrl)) {
      return colorCache.get(imageUrl)!
    }

    const { colorCount = 10 } = options

    // Dynamic import of ColorThief for better client-side performance
    const ColorThief = (await import('colorthief')).default
    const colorThief = new ColorThief()

    // Create image element
    const img = await createImage(imageUrl)

    // Extract dominant color and palette
    const dominantColor = colorThief.getColor(img)
    const palette = colorThief.getPalette(img, colorCount)

    // Convert RGB arrays to hex colors
    const primaryColor = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2])
    
    // Find the darkest and lightest colors from palette for variations
    let darkestColor = primaryColor
    let lightestColor = primaryColor
    let darkestLuminance = getRelativeLuminance(primaryColor)
    let lightestLuminance = darkestLuminance

    palette.forEach(([r, g, b]: [number, number, number]) => {
      const hexColor = rgbToHex(r, g, b)
      const luminance = getRelativeLuminance(hexColor)
      
      if (luminance < darkestLuminance) {
        darkestColor = hexColor
        darkestLuminance = luminance
      }
      
      if (luminance > lightestLuminance) {
        lightestColor = hexColor
        lightestLuminance = luminance
      }
    })
    
    // Create color variations
    const primaryDark = darkestColor !== primaryColor ? darkestColor : darkenColor(primaryColor, 0.4)
    const primaryLight = lightestColor !== primaryColor ? lightestColor : lightenColor(primaryColor, 0.3)
    
    // Use a palette color that's different from primary as accent, or create one
    const accentColor = palette.length > 1 && palette[1] 
      ? rgbToHex(palette[1][0], palette[1][1], palette[1][2])
      : darkenColor(primaryColor, 0.6)
    
    // Determine if the logo is light or dark based on primary color luminance
    const isLightLogo = getRelativeLuminance(primaryColor) > 0.5
    
    // Get accessible text color
    const textColor = getAccessibleTextColor(primaryColor)

    const extractedColors: ExtractedColors = {
      primary: primaryColor,
      primaryDark,
      primaryLight,
      accent: accentColor,
      textColor,
      isLightLogo
    }

    // Cache the result
    colorCache.set(imageUrl, extractedColors)

    return extractedColors

  } catch (error) {
    console.warn('Color extraction failed:', error)
    return FALLBACK_COLORS
  }
}

/**
 * Clears the color cache (useful for memory management)
 */
export function clearColorCache(): void {
  colorCache.clear()
  console.log('[COLOR CACHE] Cache cleared')
}

/**
 * Invalidates cache for a specific URL (useful when business switching)
 */
export function invalidateColorCache(imageUrl: string): void {
  if (colorCache.has(imageUrl)) {
    colorCache.delete(imageUrl)
    console.log('[COLOR CACHE] Invalidated cache for:', imageUrl)
  }
}

/**
 * Gets cached colors for an image URL without triggering extraction
 */
export function getCachedColors(imageUrl: string): ExtractedColors | null {
  const cached = colorCache.get(imageUrl) || null
  if (cached) {
    console.log('[COLOR CACHE] Cache hit for:', imageUrl)
  } else {
    console.log('[COLOR CACHE] Cache miss for:', imageUrl)
  }
  return cached
}

/**
 * Preloads and extracts colors for multiple images
 */
export async function preloadColors(imageUrls: string[]): Promise<Map<string, ExtractedColors>> {
  const results = new Map<string, ExtractedColors>()
  
  await Promise.allSettled(
    imageUrls.map(async (url) => {
      try {
        const colors = await extractColorsFromImage(url)
        results.set(url, colors)
      } catch (error) {
        console.warn(`Failed to preload colors for ${url}:`, error)
        results.set(url, FALLBACK_COLORS)
      }
    })
  )
  
  return results
}