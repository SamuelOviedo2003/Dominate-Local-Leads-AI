'use client'

import { ExtractedColors } from './color-extraction'

export interface ColorCacheEntry {
  colors: ExtractedColors
  timestamp: number
  version: number
  businessId?: string
  logoUrlHash: string
}

export interface CacheStats {
  memoryHits: number
  localStorageHits: number
  databaseHits: number
  misses: number
  evictions: number
  lastCleanup: number
}

// Cache configuration
const CACHE_CONFIG = {
  // Memory cache
  MEMORY_MAX_SIZE: 100, // Max entries in memory
  MEMORY_TTL: 5 * 60 * 1000, // 5 minutes in memory
  
  // localStorage cache
  LOCALSTORAGE_MAX_SIZE: 500, // Max entries in localStorage
  LOCALSTORAGE_TTL: 24 * 60 * 60 * 1000, // 24 hours in localStorage
  LOCALSTORAGE_KEY: 'dominate_color_cache',
  
  // Cache versioning
  CURRENT_VERSION: 1,
  
  // Cleanup intervals
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
  
  // Performance thresholds
  MAX_EXTRACTION_TIME: 5000, // 5 seconds max
} as const

/**
 * Multi-tier color cache manager
 * Implements a 3-tier caching strategy: Memory → localStorage → Database
 */
export class ColorCacheManager {
  private memoryCache = new Map<string, ColorCacheEntry>()
  private stats: CacheStats = {
    memoryHits: 0,
    localStorageHits: 0,
    databaseHits: 0,
    misses: 0,
    evictions: 0,
    lastCleanup: Date.now()
  }
  private cleanupInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  constructor() {
    this.initializeCache()
  }

  /**
   * Initialize the cache system
   */
  private initializeCache() {
    if (this.isInitialized) return
    
    try {
      // Start cleanup interval
      this.cleanupInterval = setInterval(() => {
        this.performCleanup()
      }, CACHE_CONFIG.CLEANUP_INTERVAL)

      // Preload critical colors from localStorage
      this.preloadFromLocalStorage()
      
      this.isInitialized = true
      // Multi-tier cache initialized
    } catch (error) {
      // Failed to initialize cache
    }
  }

  /**
   * Generate cache key from URL and business ID
   */
  private generateCacheKey(logoUrl: string, businessId?: string): string {
    const urlHash = this.hashString(logoUrl)
    return businessId ? `${businessId}:${urlHash}` : urlHash
  }

  /**
   * Simple string hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get colors from cache (checks all tiers)
   */
  async get(logoUrl: string, businessId?: string): Promise<ExtractedColors | null> {
    const cacheKey = this.generateCacheKey(logoUrl, businessId)
    const now = Date.now()

    try {
      // Tier 1: Memory cache (fastest, ~1ms)
      const memoryEntry = this.memoryCache.get(cacheKey)
      if (memoryEntry && this.isValidEntry(memoryEntry, now, CACHE_CONFIG.MEMORY_TTL)) {
        this.stats.memoryHits++
        // Memory cache hit
        return memoryEntry.colors
      }

      // Tier 2: localStorage cache (fast, ~5ms)
      const localStorageEntry = this.getFromLocalStorage(cacheKey)
      if (localStorageEntry && this.isValidEntry(localStorageEntry, now, CACHE_CONFIG.LOCALSTORAGE_TTL)) {
        this.stats.localStorageHits++
        // localStorage cache hit
        
        // Promote to memory cache
        this.setInMemory(cacheKey, localStorageEntry)
        return localStorageEntry.colors
      }

      // Tier 3: Database cache (reliable, ~50-100ms)
      if (businessId) {
        const databaseEntry = await this.getFromDatabase(businessId)
        if (databaseEntry) {
          this.stats.databaseHits++
          // Database cache hit
          
          // Promote to higher tiers
          this.setInMemory(cacheKey, databaseEntry)
          this.setInLocalStorage(cacheKey, databaseEntry)
          return databaseEntry.colors
        }
      }

      this.stats.misses++
      // Cache miss
      return null

    } catch (error) {
      // Error getting from cache
      this.stats.misses++
      return null
    }
  }

  /**
   * Set colors in cache (stores in all tiers)
   */
  async set(logoUrl: string, colors: ExtractedColors, businessId?: string): Promise<void> {
    const cacheKey = this.generateCacheKey(logoUrl, businessId)
    const entry: ColorCacheEntry = {
      colors,
      timestamp: Date.now(),
      version: CACHE_CONFIG.CURRENT_VERSION,
      businessId,
      logoUrlHash: this.hashString(logoUrl)
    }

    try {
      // Store in all tiers
      this.setInMemory(cacheKey, entry)
      this.setInLocalStorage(cacheKey, entry)
      
      // Store in database if businessId is provided
      if (businessId) {
        await this.setInDatabase(businessId, colors, logoUrl)
      }

      // Colors cached
    } catch (error) {
      // Error setting cache
    }
  }

  /**
   * Memory cache operations
   */
  private setInMemory(key: string, entry: ColorCacheEntry): void {
    // Implement LRU eviction
    if (this.memoryCache.size >= CACHE_CONFIG.MEMORY_MAX_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
        this.stats.evictions++
      }
    }
    
    this.memoryCache.set(key, entry)
  }

  /**
   * localStorage cache operations
   */
  private getFromLocalStorage(key: string): ColorCacheEntry | null {
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      if (!data) return null

      const cache = JSON.parse(data)
      return cache[key] || null
    } catch (error) {
      // localStorage read error
      return null
    }
  }

  private setInLocalStorage(key: string, entry: ColorCacheEntry): void {
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      const cache = data ? JSON.parse(data) : {}
      
      // Implement size-based eviction
      const keys = Object.keys(cache)
      if (keys.length >= CACHE_CONFIG.LOCALSTORAGE_MAX_SIZE) {
        // Remove oldest entries
        const sortedEntries = keys
          .map(k => ({ key: k, timestamp: cache[k].timestamp }))
          .sort((a, b) => a.timestamp - b.timestamp)
        
        const toRemove = sortedEntries.slice(0, Math.floor(CACHE_CONFIG.LOCALSTORAGE_MAX_SIZE * 0.1))
        toRemove.forEach(({ key: k }) => delete cache[k])
      }
      
      cache[key] = entry
      localStorage.setItem(CACHE_CONFIG.LOCALSTORAGE_KEY, JSON.stringify(cache))
    } catch (error) {
      // localStorage write error
    }
  }

  /**
   * Database cache operations (placeholder for actual implementation)
   */
  private async getFromDatabase(businessId: string): Promise<ColorCacheEntry | null> {
    try {
      // This would use the Supabase client to fetch from business_clients table
      // Implementation depends on your existing data access patterns
      // Database lookup for business
      return null // Placeholder
    } catch (error) {
      // Database read error
      return null
    }
  }

  private async setInDatabase(businessId: string, colors: ExtractedColors, logoUrl: string): Promise<void> {
    try {
      // This would use the Supabase client to update business_clients table
      // Implementation depends on your existing data access patterns
      // Database store for business
    } catch (error) {
      // Database write error
    }
  }

  /**
   * Validate cache entry
   */
  private isValidEntry(entry: ColorCacheEntry, now: number, ttl: number): boolean {
    return (
      entry.version === CACHE_CONFIG.CURRENT_VERSION &&
      (now - entry.timestamp) < ttl
    )
  }

  /**
   * Preload critical colors from localStorage
   */
  private preloadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      if (!data) return

      const cache = JSON.parse(data)
      const now = Date.now()
      let loaded = 0

      Object.entries(cache).forEach(([key, entry]) => {
        if (
          this.isValidEntry(entry as ColorCacheEntry, now, CACHE_CONFIG.MEMORY_TTL) &&
          loaded < 20 // Limit preload to prevent memory bloat
        ) {
          this.memoryCache.set(key, entry as ColorCacheEntry)
          loaded++
        }
      })

      // Preloaded entries from localStorage
    } catch (error) {
      // Preload error
    }
  }

  /**
   * Perform cache cleanup
   */
  private performCleanup(): void {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidEntry(entry, now, CACHE_CONFIG.MEMORY_TTL)) {
        this.memoryCache.delete(key)
        this.stats.evictions++
      }
    }

    // Clean localStorage cache
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      if (data) {
        const cache = JSON.parse(data)
        const validCache: Record<string, ColorCacheEntry> = {}
        
        Object.entries(cache).forEach(([key, entry]) => {
          if (this.isValidEntry(entry as ColorCacheEntry, now, CACHE_CONFIG.LOCALSTORAGE_TTL)) {
            validCache[key] = entry as ColorCacheEntry
          }
        })
        
        localStorage.setItem(CACHE_CONFIG.LOCALSTORAGE_KEY, JSON.stringify(validCache))
      }
    } catch (error) {
      // Cleanup error
    }

    this.stats.lastCleanup = now
    // Cleanup completed
  }

  /**
   * Clear specific business colors
   */
  async invalidate(logoUrl: string, businessId?: string): Promise<void> {
    const cacheKey = this.generateCacheKey(logoUrl, businessId)
    
    // Remove from memory
    this.memoryCache.delete(cacheKey)
    
    // Remove from localStorage
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      if (data) {
        const cache = JSON.parse(data)
        delete cache[cacheKey]
        localStorage.setItem(CACHE_CONFIG.LOCALSTORAGE_KEY, JSON.stringify(cache))
      }
    } catch (error) {
      // Invalidation error
    }

    // Cache entry invalidated
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.memoryCache.clear()
    try {
      localStorage.removeItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
    } catch (error) {
      // Clear all error
    }
    // All caches cleared
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { 
    memoryCacheSize: number
    localStorageCacheSize: number
    hitRate: number 
  } {
    const totalRequests = this.stats.memoryHits + this.stats.localStorageHits + 
                          this.stats.databaseHits + this.stats.misses
    const hitRate = totalRequests > 0 ? 
      ((this.stats.memoryHits + this.stats.localStorageHits + this.stats.databaseHits) / totalRequests) * 100 : 0

    let localStorageCacheSize = 0
    try {
      const data = localStorage.getItem(CACHE_CONFIG.LOCALSTORAGE_KEY)
      if (data) {
        localStorageCacheSize = Object.keys(JSON.parse(data)).length
      }
    } catch (error) {
      // Ignore error for stats
    }

    return {
      ...this.stats,
      memoryCacheSize: this.memoryCache.size,
      localStorageCacheSize,
      hitRate
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.memoryCache.clear()
    this.isInitialized = false
    // Cache manager destroyed
  }
}

// Global cache instance
let cacheManager: ColorCacheManager | null = null

/**
 * Get the global cache manager instance
 */
export function getColorCacheManager(): ColorCacheManager {
  if (!cacheManager) {
    cacheManager = new ColorCacheManager()
  }
  return cacheManager
}

/**
 * Destroy the global cache manager (for cleanup)
 */
export function destroyColorCacheManager(): void {
  if (cacheManager) {
    cacheManager.destroy()
    cacheManager = null
  }
}