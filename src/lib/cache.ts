/**
 * Intelligent caching system for API responses and computed data
 * Provides automatic invalidation, memory management, and performance optimization
 */

import { logger } from './logging'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
  key: string
  tags: string[]
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  evictions: number
  size: number
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private stats: CacheStats
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, size: 0 }
    
    // Start cleanup interval (run every 5 minutes)
    this.startCleanup()
  }

  /**
   * Get cached data with automatic expiration check
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      // Cache miss: entry not found
      return null
    }
    
    // Check if expired
    const now = Date.now()
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.stats.evictions++
      this.stats.size = this.cache.size
      this.stats.misses++
      // Cache miss: entry expired
      return null
    }
    
    this.stats.hits++
    const age = now - entry.timestamp
    logger.debug('Cache hit', { key, age })
    // Cache hit
    return entry.data
  }

  /**
   * Set cached data with TTL and tags for invalidation
   */
  set<T>(key: string, data: T, ttl: number = 300000, tags: string[] = []): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags
    }

    this.cache.set(key, entry)
    this.stats.sets++
    this.stats.size = this.cache.size
    
    logger.debug('Cache set', { key, ttl, tags, size: this.cache.size })
    // Cache set
  }

  /**
   * Invalidate cache entries by key pattern or tags
   */
  invalidate(pattern?: string, tags?: string[]): number {
    let evicted = 0
    
    for (const [key, entry] of this.cache.entries()) {
      let shouldEvict = false
      
      // Check pattern match
      if (pattern && key.includes(pattern)) {
        shouldEvict = true
      }
      
      // Check tag match
      if (tags && tags.some(tag => entry.tags.includes(tag))) {
        shouldEvict = true
      }
      
      if (shouldEvict) {
        this.cache.delete(key)
        evicted++
      }
    }
    
    this.stats.evictions += evicted
    this.stats.size = this.cache.size
    
    if (evicted > 0) {
      logger.info('Cache invalidation', { pattern, tags, evicted })
      // Cache invalidated
    }
    
    return evicted
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats.evictions += size
    this.stats.size = 0
    
    logger.info('Cache cleared', { evicted: size })
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned
      this.stats.size = this.cache.size
      logger.debug('Cache cleanup', { expired: cleaned, remaining: this.cache.size })
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global cache instance
const globalCache = new InMemoryCache(1000)

// Cache TTL constants
export const CACHE_TTL = {
  VERY_SHORT: 30 * 1000,      // 30 seconds
  SHORT: 2 * 60 * 1000,       // 2 minutes  
  MEDIUM: 5 * 60 * 1000,      // 5 minutes
  LONG: 15 * 60 * 1000,       // 15 minutes
  VERY_LONG: 60 * 60 * 1000   // 1 hour
} as const

// Cache tags for organized invalidation
export const CACHE_TAGS = {
  LEADS: 'leads',
  METRICS: 'metrics',
  CALLS: 'calls',
  BUSINESS: 'business',
  USER: 'user',
  BOOKINGS: 'bookings',
  DASHBOARD: 'dashboard'
} as const

/**
 * High-level caching functions
 */

/**
 * Cache API response with automatic key generation
 */
export async function cacheAPIResponse<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM,
  tags: string[] = []
): Promise<T> {
  // Try to get from cache first
  const cached = globalCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  try {
    const data = await fetchFn()
    globalCache.set(key, data, ttl, tags)
    return data
  } catch (error) {
    logger.error('Cache fetch error', { key, error })
    throw error
  }
}

/**
 * Cache computed data (expensive calculations)
 */
export function cacheComputation<T>(
  key: string,
  computeFn: () => T,
  ttl: number = CACHE_TTL.SHORT,
  tags: string[] = []
): T {
  // Try to get from cache first
  const cached = globalCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Compute fresh data
  try {
    const data = computeFn()
    globalCache.set(key, data, ttl, tags)
    return data
  } catch (error) {
    logger.error('Cache computation error', { key, error })
    throw error
  }
}

/**
 * Invalidate cache by business ID (common pattern)
 */
export function invalidateBusinessCache(businessId: number): void {
  globalCache.invalidate(`business:${businessId}`)
  globalCache.invalidate(undefined, [`business_${businessId}`])
}

/**
 * Invalidate cache by user ID
 */
export function invalidateUserCache(userId: string): void {
  globalCache.invalidate(`user:${userId}`)
  globalCache.invalidate(undefined, [`user_${userId}`])
}

/**
 * Generate cache key for API endpoints
 */
export function generateAPIKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return `api:${endpoint}?${sortedParams}`
}

/**
 * Generate cache key for business-specific data
 */
export function generateBusinessKey(businessId: number, resource: string, params?: Record<string, any>): string {
  const baseKey = `business:${businessId}:${resource}`
  
  if (!params || Object.keys(params).length === 0) {
    return baseKey
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return `${baseKey}?${sortedParams}`
}

/**
 * React hook for cached data with automatic invalidation
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    enabled?: boolean
    onError?: (error: Error) => void
  } = {}
) {
  const { ttl = CACHE_TTL.MEDIUM, tags = [], enabled = true, onError } = options

  // This would need to be implemented as a custom hook in a React context
  // For now, returning the cache function
  return async () => {
    if (!enabled) {
      return null
    }

    try {
      return await cacheAPIResponse(key, fetchFn, ttl, tags)
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error)
      }
      throw error
    }
  }
}

// Export cache instance and utilities
export const cache = {
  get: globalCache.get.bind(globalCache),
  set: globalCache.set.bind(globalCache),
  invalidate: globalCache.invalidate.bind(globalCache),
  clear: globalCache.clear.bind(globalCache),
  getStats: globalCache.getStats.bind(globalCache)
}

// Utility for debugging cache performance
export function logCacheStats(): void {
  const stats = globalCache.getStats()
  const hitRate = stats.hits / (stats.hits + stats.misses) * 100
  
  logger.info('Cache performance stats', {
    ...stats,
    hitRate: `${hitRate.toFixed(1)}%`,
    efficiency: hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : 'needs improvement'
  })
}

// Export for cleanup in tests or shutdown
export { globalCache }