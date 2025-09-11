/**
 * Redis Session Store for Distributed Session Management
 * 
 * This implements a proper external session store to prevent session bleeding
 * across multiple instances and provides atomic operations for business switching.
 */

import Redis from 'ioredis'
import { sessionMonitor } from '@/lib/session-monitoring'

interface SessionData {
  userId: string
  userEmail: string
  currentBusinessId?: string
  accessibleBusinesses: string[]
  lastActivity: number
  ipAddress?: string
  userAgent?: string
}

interface BusinessSwitchLock {
  userId: string
  targetBusinessId: string
  timestamp: number
  lockId: string
}

class RedisSessionStore {
  private static instance: RedisSessionStore | null = null
  private redis: Redis | null = null
  private isConnected = false
  
  // Session configuration
  private readonly SESSION_TTL = 86400 // 24 hours
  private readonly LOCK_TTL = 30 // 30 seconds for business switch locks
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 100 // milliseconds

  public static getInstance(): RedisSessionStore {
    if (!RedisSessionStore.instance) {
      RedisSessionStore.instance = new RedisSessionStore()
    }
    return RedisSessionStore.instance
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (this.isConnected) return

    try {
      // Use Redis URL if available, otherwise use individual connection params
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL
      
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
        })
      } else {
        // Fallback to individual parameters
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
        })
      }

      // Set up event handlers
      this.redis.on('connect', () => {
        console.log('[REDIS] Connected to Redis server')
        this.isConnected = true
      })

      this.redis.on('error', (error) => {
        console.error('[REDIS] Redis connection error:', error)
        this.isConnected = false
      })

      this.redis.on('close', () => {
        console.log('[REDIS] Redis connection closed')
        this.isConnected = false
      })

      // Test the connection
      await this.redis.ping()
      this.isConnected = true
      
      console.log('[REDIS] Session store initialized successfully')
    } catch (error) {
      console.error('[REDIS] Failed to initialize Redis session store:', error)
      // Don't throw - allow app to continue with degraded functionality
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.redis !== null
  }

  /**
   * Get session key for a user
   */
  private getSessionKey(userId: string): string {
    return `session:user:${userId}`
  }

  /**
   * Get business switch lock key
   */
  private getBusinessSwitchLockKey(userId: string): string {
    return `lock:business_switch:${userId}`
  }

  /**
   * Store session data for a user
   */
  async setSession(userId: string, sessionData: SessionData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[REDIS] Redis not available, skipping session storage')
      return false
    }

    try {
      const key = this.getSessionKey(userId)
      const serializedData = JSON.stringify({
        ...sessionData,
        lastActivity: Date.now()
      })

      await this.redis!.setex(key, this.SESSION_TTL, serializedData)
      
      console.log(`[REDIS] Session stored for user ${userId}`)
      return true
    } catch (error) {
      console.error('[REDIS] Failed to store session:', error)
      return false
    }
  }

  /**
   * Get session data for a user
   */
  async getSession(userId: string): Promise<SessionData | null> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const key = this.getSessionKey(userId)
      const data = await this.redis!.get(key)
      
      if (!data) {
        return null
      }

      const sessionData = JSON.parse(data) as SessionData
      
      // Update last activity
      sessionData.lastActivity = Date.now()
      await this.setSession(userId, sessionData)
      
      return sessionData
    } catch (error) {
      console.error('[REDIS] Failed to get session:', error)
      return null
    }
  }

  /**
   * Delete session data for a user
   */
  async deleteSession(userId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const key = this.getSessionKey(userId)
      await this.redis!.del(key)
      
      console.log(`[REDIS] Session deleted for user ${userId}`)
      return true
    } catch (error) {
      console.error('[REDIS] Failed to delete session:', error)
      return false
    }
  }

  /**
   * Acquire a distributed lock for business switching
   */
  async acquireBusinessSwitchLock(userId: string, targetBusinessId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('[REDIS] Redis not available, skipping business switch lock')
      return null
    }

    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const lockKey = this.getBusinessSwitchLockKey(userId)
    
    const lockData: BusinessSwitchLock = {
      userId,
      targetBusinessId,
      timestamp: Date.now(),
      lockId
    }

    try {
      // Use SET with NX (only set if key doesn't exist) and EX (expire time)
      const result = await this.redis!.set(
        lockKey, 
        JSON.stringify(lockData), 
        'EX', 
        this.LOCK_TTL, 
        'NX'
      )

      if (result === 'OK') {
        console.log(`[REDIS] Business switch lock acquired for user ${userId} -> business ${targetBusinessId}`)
        
        // Track lock acquisition
        sessionMonitor.trackEvent({
          sessionId: lockId,
          userId,
          businessId: targetBusinessId,
          action: 'business_switch',
          details: {
            operation: 'lock_acquired',
            lockId
          }
        })
        
        return lockId
      } else {
        console.warn(`[REDIS] Failed to acquire business switch lock for user ${userId} - already locked`)
        return null
      }
    } catch (error) {
      console.error('[REDIS] Error acquiring business switch lock:', error)
      return null
    }
  }

  /**
   * Release a business switch lock
   */
  async releaseBusinessSwitchLock(userId: string, lockId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    const lockKey = this.getBusinessSwitchLockKey(userId)
    
    try {
      // Use Lua script to atomically check and delete lock
      const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current then
          local lockData = cjson.decode(current)
          if lockData.lockId == ARGV[1] then
            redis.call('DEL', KEYS[1])
            return 1
          end
        end
        return 0
      `
      
      const result = await this.redis!.eval(luaScript, 1, lockKey, lockId) as number
      
      if (result === 1) {
        console.log(`[REDIS] Business switch lock released for user ${userId}`)
        
        // Track lock release
        sessionMonitor.trackEvent({
          sessionId: lockId,
          userId,
          action: 'business_switch',
          details: {
            operation: 'lock_released',
            lockId
          }
        })
        
        return true
      } else {
        console.warn(`[REDIS] Failed to release business switch lock - lock not found or doesn't match`)
        return false
      }
    } catch (error) {
      console.error('[REDIS] Error releasing business switch lock:', error)
      return false
    }
  }

  /**
   * Perform atomic business switch with distributed locking
   */
  async atomicBusinessSwitch(
    userId: string, 
    targetBusinessId: string,
    switchFunction: () => Promise<boolean>
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[REDIS] Starting atomic business switch for user ${userId} -> business ${targetBusinessId}`)
    
    // Try to acquire lock
    const lockId = await this.acquireBusinessSwitchLock(userId, targetBusinessId)
    
    if (!lockId) {
      return {
        success: false,
        error: 'Business switch already in progress for this user'
      }
    }

    try {
      // Execute the business switch function
      const switchSuccess = await switchFunction()
      
      if (switchSuccess) {
        // Update session with new business context
        const sessionData = await this.getSession(userId)
        if (sessionData) {
          sessionData.currentBusinessId = targetBusinessId
          await this.setSession(userId, sessionData)
        }
        
        console.log(`[REDIS] Atomic business switch completed successfully for user ${userId}`)
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Business switch operation failed'
        }
      }
    } catch (error) {
      console.error('[REDIS] Error during atomic business switch:', error)
      return {
        success: false,
        error: 'Internal error during business switch'
      }
    } finally {
      // Always release the lock
      await this.releaseBusinessSwitchLock(userId, lockId)
    }
  }

  /**
   * Get all active sessions (for monitoring)
   */
  async getActiveSessions(): Promise<{ userId: string; lastActivity: number }[]> {
    if (!this.isAvailable()) {
      return []
    }

    try {
      const keys = await this.redis!.keys('session:user:*')
      const sessions = []
      
      for (const key of keys) {
        const data = await this.redis!.get(key)
        if (data) {
          const sessionData = JSON.parse(data) as SessionData
          sessions.push({
            userId: sessionData.userId,
            lastActivity: sessionData.lastActivity
          })
        }
      }
      
      return sessions
    } catch (error) {
      console.error('[REDIS] Error getting active sessions:', error)
      return []
    }
  }

  /**
   * Clean up expired sessions and locks
   */
  async cleanup(): Promise<void> {
    if (!this.isAvailable()) {
      return
    }

    try {
      // Redis automatically handles TTL expiration, but we can do additional cleanup
      const lockKeys = await this.redis!.keys('lock:business_switch:*')
      
      for (const key of lockKeys) {
        const ttl = await this.redis!.ttl(key)
        if (ttl === -1) { // Key exists but has no expiration
          await this.redis!.del(key)
          console.log(`[REDIS] Cleaned up stale lock: ${key}`)
        }
      }
    } catch (error) {
      console.error('[REDIS] Error during cleanup:', error)
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.isConnected = false
      console.log('[REDIS] Disconnected from Redis')
    }
  }
}

// Export singleton instance
export const redisSessionStore = RedisSessionStore.getInstance()

// Helper function to initialize Redis on app startup
export async function initializeSessionStore(): Promise<void> {
  await redisSessionStore.initialize()
}

// Export class for testing
export { RedisSessionStore }