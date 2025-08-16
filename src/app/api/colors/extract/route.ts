import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Input validation schema
const extractColorsSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  businessId: z.string().optional(),
  options: z.object({
    quality: z.number().min(1).max(100).optional(),
    colorCount: z.number().min(2).max(256).optional(),
    ignoreTransparent: z.boolean().optional()
  }).optional()
})

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per IP
}

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting middleware
 */
function checkRateLimit(request: NextRequest): boolean {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const windowStart = now - RATE_LIMIT.windowMs
  
  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
  
  const currentRequests = rateLimitStore.get(ip)
  
  if (!currentRequests) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return true
  }
  
  if (currentRequests.resetTime < now) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return true
  }
  
  if (currentRequests.count >= RATE_LIMIT.maxRequests) {
    return false
  }
  
  currentRequests.count++
  return true
}

/**
 * Server-side color extraction using Node.js Canvas API
 */
async function extractColorsServerSide(imageUrl: string, options: any = {}) {
  // This would be implemented with a Node.js-compatible color extraction library
  // such as node-canvas + custom color analysis or a server-side ColorThief alternative
  
  // For now, we'll return a placeholder implementation
  // In production, you would use something like:
  // - node-canvas for image processing
  // - quantize.js for color quantization
  // - Or implement ColorThief server-side equivalent
  
  console.log('[SERVER COLOR EXTRACTION] Processing:', imageUrl, options)
  
  // Placeholder response - replace with actual implementation
  return {
    primary: '#FF6B35',
    primaryDark: '#B23E1A',
    primaryLight: '#FF9F66',
    accent: '#334155',
    textColor: '#FFFFFF',
    isLightLogo: false
  }
}

/**
 * GET handler for retrieving cached colors
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('imageUrl')
    const businessId = searchParams.get('businessId')

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      )
    }

    // Here you would check the database cache for existing colors
    // For now, we'll return null to indicate cache miss
    
    return NextResponse.json({ cached: null })

  } catch (error) {
    console.error('[COLOR API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST handler for color extraction
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Rate limiting check
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = extractColorsSchema.parse(body)
    
    const { imageUrl, businessId, options = {} } = validatedData

    console.log('[COLOR API] Processing color extraction request:', {
      imageUrl,
      businessId,
      options
    })

    // Security: Validate image URL domain (optional)
    const allowedDomains = [
      'supabase.com',
      'amazonaws.com',
      'cloudfront.net',
      'your-domain.com' // Add your allowed domains
    ]

    const urlDomain = new URL(imageUrl).hostname
    const isDomainAllowed = allowedDomains.some(domain => 
      urlDomain.includes(domain) || urlDomain.endsWith(domain)
    )

    if (!isDomainAllowed) {
      console.warn('[COLOR API] Blocked request for domain:', urlDomain)
      return NextResponse.json(
        { error: 'Image domain not allowed' },
        { status: 403 }
      )
    }

    try {
      // Extract colors using server-side implementation
      const extractedColors = await extractColorsServerSide(imageUrl, options)
      
      const processingTime = Date.now() - startTime

      // Here you would store the colors in the database
      // if (businessId) {
      //   await updateBusinessColors(businessId, extractedColors)
      // }

      console.log('[COLOR API] Extraction completed in', processingTime, 'ms')

      return NextResponse.json({
        success: true,
        colors: extractedColors,
        processingTime,
        cached: false
      })

    } catch (extractionError) {
      console.error('[COLOR API] Color extraction failed:', extractionError)
      
      // Return fallback colors
      const fallbackColors = {
        primary: '#FF6B35',
        primaryDark: '#B23E1A',
        primaryLight: '#FF9F66',
        accent: '#334155',
        textColor: '#FFFFFF',
        isLightLogo: false
      }

      return NextResponse.json({
        success: true,
        colors: fallbackColors,
        processingTime: Date.now() - startTime,
        cached: false,
        fallback: true
      })
    }

  } catch (error) {
    console.error('[COLOR API] Request processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT handler for updating cached colors
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting check
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await request.json()
    const { businessId, colors, imageUrl } = body

    if (!businessId || !colors || !imageUrl) {
      return NextResponse.json(
        { error: 'businessId, colors, and imageUrl are required' },
        { status: 400 }
      )
    }

    // Here you would update the database with the cached colors
    // await updateBusinessColors(businessId, colors, imageUrl)

    console.log('[COLOR API] Updated colors for business:', businessId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[COLOR API] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for clearing cached colors
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting check
    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter is required' },
        { status: 400 }
      )
    }

    // Here you would clear the cached colors from the database
    // await clearBusinessColors(businessId)

    console.log('[COLOR API] Cleared colors for business:', businessId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[COLOR API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}