'use client'

import { getColorCacheManager } from './color-cache'
import { getWorkerPool } from './worker-pool'

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
  useWorker?: boolean
  priority?: number
  businessId?: string
}

export interface ColorExtractionMetrics {
  extractionTime: number
  cacheHit: boolean
  workerUsed: boolean
  fallbackUsed: boolean
  source: 'memory' | 'localStorage' | 'database' | 'extraction' | 'fallback'
}

// Fallback brand colors
const FALLBACK_COLORS: ExtractedColors = {
  primary: '#FF6B35',
  primaryDark: '#B23E1A',
  primaryLight: '#FF9F66',
  accent: '#334155',
  textColor: '#FFFFFF',
  isLightLogo: false
}

// Performance monitoring
const performanceMetrics = {
  totalExtractions: 0,
  cacheHits: 0,
  workerExtractions: 0,
  fallbackExtractions: 0,
  averageExtractionTime: 0,
  errors: 0
}

// Request debouncing
const debounceMap = new Map<string, Promise<ExtractedColors>>()

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
 * Optimized color extraction with multi-tier caching and worker support
 */
export async function extractColorsFromImage(
  imageUrl: string, 
  options: ColorExtractionOptions = {}
): Promise<ExtractedColors> {
  const startTime = performance.now()
  performanceMetrics.totalExtractions++

  try {
    const { 
      useWorker = true, 
      priority = 0,
      businessId,
      ...extractionOptions 
    } = options

    // Generate debounce key
    const debounceKey = `${imageUrl}:${businessId || 'no-business'}`
    
    // Check if we're already processing this request
    if (debounceMap.has(debounceKey)) {
      // Debouncing request
      return await debounceMap.get(debounceKey)!
    }

    // Create extraction promise
    const extractionPromise = performExtraction(imageUrl, {
      ...extractionOptions,
      useWorker,
      priority,
      businessId
    }, startTime)

    // Store in debounce map
    debounceMap.set(debounceKey, extractionPromise)

    // Clean up debounce map after completion
    extractionPromise.finally(() => {
      debounceMap.delete(debounceKey)
    })

    return await extractionPromise

  } catch (error) {
    performanceMetrics.errors++
    // Extraction failed
    updateMetrics(startTime, false, false, true, 'fallback')
    return FALLBACK_COLORS
  }
}

/**
 * Internal extraction logic with caching and worker support
 */
async function performExtraction(
  imageUrl: string,
  options: Omit<ColorExtractionOptions, 'useWorker' | 'priority'> & {
    useWorker: boolean
    priority: number
    businessId?: string
  },
  startTime: number
): Promise<ExtractedColors> {
  const { useWorker, priority, businessId, ...extractionOptions } = options
  const cacheManager = getColorCacheManager()

  try {
    // Check multi-tier cache first
    const cachedColors = await cacheManager.get(imageUrl, businessId)
    if (cachedColors) {
      performanceMetrics.cacheHits++
      updateMetrics(startTime, true, false, false, 'memory')
      // Cache hit
      return cachedColors
    }

    // Cache miss, extracting colors

    let extractedColors: ExtractedColors

    // Use worker pool if supported and enabled
    if (useWorker) {
      try {
        const workerPool = getWorkerPool()
        extractedColors = await workerPool.extractColors(
          imageUrl, 
          extractionOptions,
          priority,
          businessId
        )
        performanceMetrics.workerExtractions++
        updateMetrics(startTime, false, true, false, 'extraction')
        // Worker extraction completed
      } catch (workerError) {
        // Worker extraction failed, falling back to main thread
        extractedColors = await mainThreadExtraction(imageUrl, extractionOptions)
        performanceMetrics.fallbackExtractions++
        updateMetrics(startTime, false, false, true, 'extraction')
      }
    } else {
      // Main thread extraction
      extractedColors = await mainThreadExtraction(imageUrl, extractionOptions)
      updateMetrics(startTime, false, false, false, 'extraction')
    }

    // Cache the result
    await cacheManager.set(imageUrl, extractedColors, businessId)
    
    // Colors extracted and cached
    return extractedColors

  } catch (error) {
    // Extraction failed
    throw error
  }
}

/**
 * Main thread color extraction (fallback)
 */
async function mainThreadExtraction(
  imageUrl: string,
  options: ColorExtractionOptions
): Promise<ExtractedColors> {
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

  return {
    primary: primaryColor,
    primaryDark,
    primaryLight,
    accent: accentColor,
    textColor,
    isLightLogo
  }
}

/**
 * Update performance metrics
 */
function updateMetrics(
  startTime: number, 
  cacheHit: boolean, 
  workerUsed: boolean, 
  fallbackUsed: boolean,
  source: ColorExtractionMetrics['source']
): void {
  const extractionTime = performance.now() - startTime
  
  // Update average extraction time
  const totalCompleted = performanceMetrics.totalExtractions
  performanceMetrics.averageExtractionTime = (
    (performanceMetrics.averageExtractionTime * (totalCompleted - 1)) + extractionTime
  ) / totalCompleted

  // Recording extraction metrics
}

/**
 * Enhanced cache management functions
 */
export function clearColorCache(): void {
  const cacheManager = getColorCacheManager()
  cacheManager.clearAll()
  // All caches cleared
}

export async function invalidateColorCache(imageUrl: string, businessId?: string): Promise<void> {
  const cacheManager = getColorCacheManager()
  await cacheManager.invalidate(imageUrl, businessId)
  // Invalidated cache for image
}

export async function getCachedColors(imageUrl: string, businessId?: string): Promise<ExtractedColors | null> {
  const cacheManager = getColorCacheManager()
  return await cacheManager.get(imageUrl, businessId)
}

/**
 * Enhanced preloading with worker support and priority
 */
export async function preloadColors(
  imageUrls: string[], 
  options: { 
    businessId?: string
    priority?: number
    batchSize?: number 
  } = {}
): Promise<Map<string, ExtractedColors>> {
  const { businessId, priority = -1, batchSize = 3 } = options
  const results = new Map<string, ExtractedColors>()
  
  // Process in batches to avoid overwhelming the worker pool
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize)
    
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const colors = await extractColorsFromImage(url, {
            businessId,
            priority,
            useWorker: true,
            quality: 20, // Lower quality for preloading
            colorCount: 32
          })
          results.set(url, colors)
        } catch (error) {
          // Failed to preload colors
          results.set(url, FALLBACK_COLORS)
        }
      })
    )
    
    // Small delay between batches to prevent overwhelming
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  
  // Preloaded colors for images
  return results
}

/**
 * Get performance metrics and statistics
 */
export function getColorExtractionStats() {
  const cacheManager = getColorCacheManager()
  const workerPool = getWorkerPool()
  
  return {
    extraction: performanceMetrics,
    cache: cacheManager.getStats(),
    worker: workerPool.getStats()
  }
}

/**
 * Warm up the color extraction system
 */
export async function warmUpColorExtraction(imageUrls: string[] = []): Promise<void> {
  // Warming up color extraction system
  
  try {
    // Initialize cache manager
    getColorCacheManager()
    
    // Initialize worker pool
    getWorkerPool()
    
    // Preload critical colors if provided
    if (imageUrls.length > 0) {
      await preloadColors(imageUrls, { priority: 10 })
    }
    
    // Warm-up completed successfully
  } catch (error) {
    // Warm-up failed
  }
}

/**
 * Cleanup function for performance and memory management
 */
export async function cleanupColorExtraction(): Promise<void> {
  // Cleaning up color extraction system
  
  try {
    // Clear debounce map
    debounceMap.clear()
    
    // Destroy worker pool using dynamic import for better compatibility
    try {
      const { destroyWorkerPool } = await import('./worker-pool')
      destroyWorkerPool()
    } catch (error) {
      // Worker pool cleanup failed
    }
    
    // Destroy cache manager using dynamic import for better compatibility
    try {
      const { destroyColorCacheManager } = await import('./color-cache')
      destroyColorCacheManager()
    } catch (error) {
      // Cache manager cleanup failed
    }
    
    // Cleanup completed
  } catch (error) {
    // Cleanup error
  }
}