/**
 * Permalink-specific caching layer for business resolution
 * Provides robust caching with TTL, fallback capabilities, and rate limit handling
 * Single source of truth for permalink -> business mapping
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { cache, CACHE_TTL, CACHE_TAGS } from '@/lib/cache'
import { cookies } from 'next/headers'

export interface BusinessData {
  business_id: number
  company_name: string
  permalink: string
  dashboard?: boolean
  avatar_url?: string
  city?: string
  state?: string
}

export interface PermalinkCacheEntry {
  business: BusinessData
  timestamp: number
  source: 'cache' | 'database'
}

export interface RateLimitState {
  count: number
  resetTime: number
  lastRetryAfter?: number
}

/**
 * Cache configuration for permalink operations
 */
const PERMALINK_CACHE_CONFIG = {
  // Cache TTL for different scenarios
  TTL: {
    VALID_BUSINESS: 15 * 60 * 1000,     // 15 minutes for valid businesses
    INVALID_PERMALINK: 2 * 60 * 1000,    // 2 minutes for 404s (shorter to handle new businesses)
    RATE_LIMITED: 30 * 1000,             // 30 seconds for rate limit fallback
  },
  
  // Rate limiting settings
  RATE_LIMIT: {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,                    // 1 second base delay
    MAX_DELAY: 8000,                     // 8 second max delay
    BACKOFF_MULTIPLIER: 2,
  }
} as const

/**
 * Rate limit handler with exponential backoff
 */
class PermalinkRateLimitHandler {
  private static rateLimitState = new Map<string, RateLimitState>()

  /**
   * Check if we're currently rate limited for a permalink
   */
  static isRateLimited(permalink: string): boolean {
    const state = this.rateLimitState.get(permalink)
    if (!state) return false
    
    const now = Date.now()
    if (now >= state.resetTime) {
      this.rateLimitState.delete(permalink)
      return false
    }
    
    return state.count >= PERMALINK_CACHE_CONFIG.RATE_LIMIT.MAX_RETRIES
  }

  /**
   * Record a rate limit hit and calculate backoff
   */
  static recordRateLimit(permalink: string, retryAfter?: number): number {
    const now = Date.now()
    const state = this.rateLimitState.get(permalink) || { count: 0, resetTime: now }
    
    state.count++
    state.lastRetryAfter = retryAfter
    
    // Calculate exponential backoff delay
    const backoffDelay = Math.min(
      PERMALINK_CACHE_CONFIG.RATE_LIMIT.BASE_DELAY * Math.pow(PERMALINK_CACHE_CONFIG.RATE_LIMIT.BACKOFF_MULTIPLIER, state.count - 1),
      PERMALINK_CACHE_CONFIG.RATE_LIMIT.MAX_DELAY
    )
    
    // Use server-provided retry-after if available, otherwise use backoff
    const delayMs = retryAfter ? retryAfter * 1000 : backoffDelay
    state.resetTime = now + delayMs
    
    this.rateLimitState.set(permalink, state)
    
    // Rate limit recorded for permalink
    
    return delayMs
  }

  /**
   * Clear rate limit state for a permalink
   */
  static clearRateLimit(permalink: string): void {
    this.rateLimitState.delete(permalink)
  }
}

/**
 * Get cached business data for a permalink with rate limit awareness
 */
export async function getCachedBusiness(permalink: string): Promise<PermalinkCacheEntry | null> {
  const cacheKey = `permalink:${permalink}`
  
  // Check cache first
  const cached = cache.get<BusinessData>(cacheKey)
  if (cached) {
    // Business found in cache
    return {
      business: cached,
      timestamp: Date.now(),
      source: 'cache'
    }
  }
  
  // No cached data for permalink
  
  // Check if we're rate limited
  if (PermalinkRateLimitHandler.isRateLimited(permalink)) {
    // Rate limited for permalink, returning null
    return null
  }
  
  return null
}

/**
 * Fetch business data from database with rate limit handling
 */
export async function fetchBusinessFromDatabase(permalink: string): Promise<PermalinkCacheEntry | null> {
  const cacheKey = `permalink:${permalink}`
  const invalidCacheKey = `permalink:invalid:${permalink}`
  
  try {
    // Fetching business from database for permalink
    
    // Use regular client with publishable key - business_clients table should be publicly readable for permalinks
    const supabase = await createClient()
    
    const { data: business, error } = await supabase
      .from('business_clients')
      .select('business_id, company_name, permalink, dashboard, avatar_url, city, state')
      .eq('permalink', permalink)
      .single()
    
    if (error) {
      // Handle specific Supabase errors
      if (error.code === '23505') {
        // Unique constraint violation - shouldn't happen for reads
        // Unique constraint violation for permalink
        return null
      }
      
      if (error.message.includes('rate limit') || error.code === 'rate_limit_exceeded') {
        // Rate limit error
        // Rate limit error for permalink
        const delayMs = PermalinkRateLimitHandler.recordRateLimit(permalink)
        
        // Try to serve from cache if available (even if expired)
        const staleCache = cache.get<BusinessData>(cacheKey)
        if (staleCache) {
          // Serving stale cache due to rate limit
          return {
            business: staleCache,
            timestamp: Date.now(),
            source: 'cache'
          }
        }
        
        return null
      }
      
      if (error.details?.includes('Results contain 0 rows') || error.message.includes('No rows returned')) {
        // Business not found - cache the negative result for a shorter time
        // Business not found for permalink
        cache.set(invalidCacheKey, true, PERMALINK_CACHE_CONFIG.TTL.INVALID_PERMALINK, [CACHE_TAGS.BUSINESS])
        return null
      }
      
      // Other errors
      // Database error for permalink
      return null
    }
    
    if (!business) {
      // No business data returned for permalink
      cache.set(invalidCacheKey, true, PERMALINK_CACHE_CONFIG.TTL.INVALID_PERMALINK, [CACHE_TAGS.BUSINESS])
      return null
    }
    
    // Business fetched successfully
    
    // Cache the valid business for the full TTL
    cache.set(
      cacheKey, 
      business, 
      PERMALINK_CACHE_CONFIG.TTL.VALID_BUSINESS, 
      [CACHE_TAGS.BUSINESS, `business_${business.business_id}`]
    )
    
    // Clear any previous rate limit state on success
    PermalinkRateLimitHandler.clearRateLimit(permalink)
    
    return {
      business,
      timestamp: Date.now(),
      source: 'database'
    }
    
  } catch (error) {
    // Unexpected error fetching business for permalink
    
    // Check if this looks like a rate limit error
    if (error instanceof Error && (
      error.message.includes('429') || 
      error.message.includes('rate limit') ||
      error.message.includes('too many requests')
    )) {
      PermalinkRateLimitHandler.recordRateLimit(permalink)
    }
    
    return null
  }
}

/**
 * Get business data for a permalink with full caching and rate limit handling
 * This is the main function that should be used by middleware and layouts
 */
export async function getBusinessByPermalink(permalink: string): Promise<PermalinkCacheEntry | null> {
  // First check if we have a cached "invalid" result
  const invalidCacheKey = `permalink:invalid:${permalink}`
  const isInvalid = cache.get<boolean>(invalidCacheKey)
  if (isInvalid) {
    // Permalink marked as invalid
    return null
  }
  
  // Try to get from cache first
  const cached = await getCachedBusiness(permalink)
  if (cached) {
    return cached
  }
  
  // Fetch from database
  return await fetchBusinessFromDatabase(permalink)
}

/**
 * Validate if a permalink exists (lightweight check for middleware)
 */
export async function validatePermalinkExists(permalink: string): Promise<boolean> {
  const result = await getBusinessByPermalink(permalink)
  return result !== null
}

/**
 * Invalidate cache for a specific permalink
 */
export function invalidatePermalinkCache(permalink: string): void {
  const cacheKey = `permalink:${permalink}`
  const invalidCacheKey = `permalink:invalid:${permalink}`
  
  cache.invalidate(cacheKey)
  cache.invalidate(invalidCacheKey)
  
  // Clear rate limit state
  PermalinkRateLimitHandler.clearRateLimit(permalink)
  
  // Cache invalidated for permalink
}

/**
 * Invalidate cache for a business by business_id
 */
export function invalidateBusinessCache(businessId: number): void {
  cache.invalidate(undefined, [`business_${businessId}`])
  // Cache invalidated for business
}

/**
 * Get cache stats for monitoring
 */
export function getPermalinkCacheStats() {
  const stats = cache.getStats()
  
  return {
    ...stats,
    hitRate: stats.hits / (stats.hits + stats.misses) * 100,
    cacheHealth: stats.hits / (stats.hits + stats.misses) > 0.8 ? 'excellent' : 
                 stats.hits / (stats.hits + stats.misses) > 0.6 ? 'good' : 'needs improvement'
  }
}

/**
 * Preload business data for a permalink (useful for prefetching)
 */
export async function preloadBusiness(permalink: string): Promise<void> {
  const cached = cache.get<BusinessData>(`permalink:${permalink}`)
  if (!cached) {
    await getBusinessByPermalink(permalink)
  }
}

/**
 * Get business data with user-friendly error handling
 * Returns detailed error information for debugging
 */
export async function getBusinessWithErrorInfo(permalink: string): Promise<{
  business: BusinessData | null
  error: string | null
  source: 'cache' | 'database' | 'error'
  isRateLimited: boolean
}> {
  // Check rate limit status
  const isRateLimited = PermalinkRateLimitHandler.isRateLimited(permalink)
  if (isRateLimited) {
    return {
      business: null,
      error: 'Rate limited - too many requests',
      source: 'error',
      isRateLimited: true
    }
  }
  
  try {
    const result = await getBusinessByPermalink(permalink)
    
    if (!result) {
      return {
        business: null,
        error: 'Business not found',
        source: 'error',
        isRateLimited: false
      }
    }
    
    return {
      business: result.business,
      error: null,
      source: result.source,
      isRateLimited: false
    }
    
  } catch (error) {
    return {
      business: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'error',
      isRateLimited: false
    }
  }
}