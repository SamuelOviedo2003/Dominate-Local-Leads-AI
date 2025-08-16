import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Enhanced rate limiting for production environments
export class ProductionRateLimiter {
  private redis: any // Redis client
  
  constructor() {
    // Initialize Redis client for production
    // this.redis = new Redis(process.env.REDIS_URL)
  }

  /**
   * Check rate limit with Redis-based storage
   * Falls back to in-memory for development
   */
  async checkRateLimit(
    request: NextRequest,
    windowMs: number = 60000,
    maxRequests: number = 30
  ): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const identifier = await this.getIdentifier(request)
    const now = Date.now()
    const windowStart = now - windowMs
    
    try {
      if (this.redis) {
        // Production: Redis-based rate limiting
        return await this.redisRateLimit(identifier, windowStart, now, maxRequests, windowMs)
      } else {
        // Development: In-memory rate limiting
        return this.memoryRateLimit(identifier, windowStart, now, maxRequests, windowMs)
      }
    } catch (error) {
      console.warn('[RATE LIMIT] Error checking rate limit:', error)
      // Allow request on error to prevent blocking legitimate users
      return { allowed: true }
    }
  }

  /**
   * Get unique identifier for rate limiting
   * Uses authenticated user ID if available, falls back to IP
   */
  private async getIdentifier(request: NextRequest): Promise<string> {
    try {
      // Try to get authenticated user
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side
      )
      
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (user) {
          return `user:${user.id}`
        }
      }
    } catch (error) {
      // Fall back to IP-based limiting
    }
    
    // Fallback to IP address
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    return `ip:${ip}`
  }

  /**
   * Redis-based rate limiting for production
   */
  private async redisRateLimit(
    identifier: string,
    windowStart: number,
    now: number,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    const key = `rate_limit:${identifier}`
    
    // Use Redis sliding window log pattern
    const pipeline = this.redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.zcard(key)
    pipeline.expire(key, Math.ceil(windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = results[2][1]
    
    const allowed = count <= maxRequests
    const resetTime = now + windowMs
    const remaining = Math.max(0, maxRequests - count)
    
    return { allowed, resetTime, remaining }
  }

  /**
   * In-memory rate limiting for development
   */
  private memoryRateLimit(
    identifier: string,
    windowStart: number,
    now: number,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; resetTime: number; remaining: number } {
    // Simple in-memory implementation (existing logic)
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
    
    const currentRequests = rateLimitStore.get(identifier)
    
    if (!currentRequests || currentRequests.resetTime < now) {
      rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
      return { allowed: true, resetTime: now + windowMs, remaining: maxRequests - 1 }
    }
    
    const allowed = currentRequests.count < maxRequests
    if (allowed) {
      currentRequests.count++
    }
    
    return {
      allowed,
      resetTime: currentRequests.resetTime,
      remaining: Math.max(0, maxRequests - currentRequests.count)
    }
  }
}

/**
 * Authentication middleware for color extraction API
 */
export async function authenticateColorExtractionRequest(request: NextRequest): Promise<{
  authenticated: boolean
  user?: any
  businessId?: string
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { authenticated: false }
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (error || !user) {
      return { authenticated: false }
    }

    // Get user's business context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('business_id, role')
      .eq('user_id', user.id)
      .single()

    return {
      authenticated: true,
      user,
      businessId: profile?.business_id
    }
    
  } catch (error) {
    console.warn('[AUTH] Authentication error:', error)
    return { authenticated: false }
  }
}

/**
 * Enhanced color extraction route with authentication and proper rate limiting
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const rateLimiter = new ProductionRateLimiter()
  
  try {
    // Authentication check
    const auth = await authenticateColorExtractionRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Enhanced rate limiting based on user tier
    const userTier = auth.user?.app_metadata?.tier || 'basic'
    const rateLimits = {
      basic: { windowMs: 60000, maxRequests: 10 },
      premium: { windowMs: 60000, maxRequests: 50 },
      enterprise: { windowMs: 60000, maxRequests: 100 }
    }
    const rateLimit = rateLimits[userTier as keyof typeof rateLimits] || rateLimits.basic

    const rateLimitResult = await rateLimiter.checkRateLimit(
      request,
      rateLimit.windowMs,
      rateLimit.maxRequests
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime,
          remaining: 0
        },
        { 
          status: 429, 
          headers: { 
            'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime!.toString()
          } 
        }
      )
    }

    // Rest of the color extraction logic...
    // (Include the server-side extraction implementation here)
    
    return NextResponse.json({
      success: true,
      colors: {}, // Colors would be extracted here
      processingTime: Date.now() - startTime,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }
    })

  } catch (error) {
    console.error('[COLOR API] Enhanced extraction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}