import { createClient } from '@supabase/supabase-js'
import { ExtractedColors } from './color-extraction'

interface ColorCacheEntry {
  colors: ExtractedColors
  timestamp: number
  priority?: number
  version?: number
  businessId?: string
  logoUrlHash?: string
}

// Enhanced database cache implementation for color-cache.ts
export class DatabaseColorCache {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Get cached colors from business_clients table
   */
  async getFromDatabase(businessId: string): Promise<ColorCacheEntry | null> {
    try {
      const { data, error } = await this.supabase
        .from('business_clients')
        .select('extracted_colors, avatar_url, updated_at')
        .eq('business_id', businessId)
        .single()

      if (error || !data?.extracted_colors) {
        return null
      }

      // Validate cache age (24 hours max)
      const cacheAge = Date.now() - new Date(data.updated_at).getTime()
      if (cacheAge > 24 * 60 * 60 * 1000) {
        return null
      }

      return {
        colors: data.extracted_colors as ExtractedColors,
        timestamp: new Date(data.updated_at).getTime(),
        version: 1,
        businessId,
        logoUrlHash: this.hashString(data.avatar_url || '')
      }
    } catch (error) {
      console.warn('[DATABASE CACHE] Read error:', error)
      return null
    }
  }

  /**
   * Store colors in business_clients table
   */
  async setInDatabase(businessId: string, colors: ExtractedColors, logoUrl: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('business_clients')
        .update({
          extracted_colors: colors,
          color_extraction_timestamp: new Date().toISOString()
        })
        .eq('business_id', businessId)

      if (error) {
        console.warn('[DATABASE CACHE] Write error:', error)
      }
    } catch (error) {
      console.warn('[DATABASE CACHE] Database error:', error)
    }
  }

  /**
   * Preload colors for all businesses a user has access to
   */
  async preloadBusinessColors(userId: string): Promise<Map<string, ExtractedColors>> {
    try {
      const { data, error } = await this.supabase
        .from('business_clients')
        .select('business_id, extracted_colors, avatar_url')
        .not('extracted_colors', 'is', null)

      if (error || !data) {
        return new Map()
      }

      const colorMap = new Map<string, ExtractedColors>()
      data.forEach(business => {
        if (business.extracted_colors) {
          colorMap.set(business.business_id, business.extracted_colors as ExtractedColors)
        }
      })

      return colorMap
    } catch (error) {
      console.warn('[DATABASE CACHE] Preload error:', error)
      return new Map()
    }
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}