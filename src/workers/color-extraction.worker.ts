// Web Worker for color extraction
// This runs in a separate thread to prevent blocking the main UI thread

// ColorThief import - only works in browser environment
let ColorThief: any

// Use dynamic import for better module resolution in production builds
async function loadColorThief() {
  if (typeof window !== 'undefined' && !ColorThief) {
    try {
      const colorThiefModule = await import('colorthief')
      ColorThief = colorThiefModule.default || colorThiefModule
    } catch (error) {
      console.warn('[WORKER] Failed to load ColorThief:', error)
    }
  }
}

export interface WorkerColorExtractionRequest {
  id: string
  imageUrl: string
  options: {
    quality?: number
    colorCount?: number
    ignoreTransparent?: boolean
  }
}

export interface WorkerColorExtractionResponse {
  id: string
  success: boolean
  colors?: {
    primary: string
    primaryDark: string
    primaryLight: string
    accent: string
    textColor: string
    isLightLogo: boolean
  }
  error?: string
  processingTime: number
}

/**
 * Calculates relative luminance of a color
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
 * Creates an image element for color extraction in worker context
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
 * Process color extraction request
 */
async function processColorExtraction(request: WorkerColorExtractionRequest): Promise<WorkerColorExtractionResponse> {
  const startTime = performance.now()
  
  try {
    const { imageUrl, options } = request
    const { colorCount = 10 } = options

    // Load ColorThief if not already loaded
    if (!ColorThief) {
      await loadColorThief()
    }

    // Check if ColorThief is available (browser environment)
    if (!ColorThief) {
      throw new Error('ColorThief not available in this environment')
    }

    // Create ColorThief instance
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

    const processingTime = performance.now() - startTime

    return {
      id: request.id,
      success: true,
      colors: {
        primary: primaryColor,
        primaryDark,
        primaryLight,
        accent: accentColor,
        textColor,
        isLightLogo
      },
      processingTime
    }

  } catch (error) {
    const processingTime = performance.now() - startTime
    
    return {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }
  }
}

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<WorkerColorExtractionRequest>) => {
  const request = event.data
  
  try {
    const response = await processColorExtraction(request)
    self.postMessage(response)
  } catch (error) {
    const response: WorkerColorExtractionResponse = {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : 'Worker processing failed',
      processingTime: 0
    }
    self.postMessage(response)
  }
})

// Notify that worker is ready
self.postMessage({ type: 'worker-ready' })

export {}