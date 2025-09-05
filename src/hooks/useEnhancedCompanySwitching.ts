import { useState } from 'react'
import { BusinessSwitcherData } from '@/types/auth'
import { useBusinessContext } from '@/contexts/BusinessContext'
import { useDynamicTheme } from '@/contexts/DynamicThemeContext'
import { preloadColors } from '@/lib/color-extraction'

interface UseCompanySwitchingReturn {
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

export function useEnhancedCompanySwitching(): UseCompanySwitchingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setCurrentBusinessId, availableBusinesses } = useBusinessContext()
  const { extractColors } = useDynamicTheme()

  const switchCompany = async (companyId: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      // Find the target company
      const targetCompany = availableBusinesses.find(c => c.business_id === companyId)
      if (!targetCompany) {
        throw new Error('Company not found')
      }

      // Step 1: Preload colors for the target company BEFORE switching
      if (targetCompany.avatar_url) {
        try {
          await preloadColors([targetCompany.avatar_url], {
            businessId: companyId,
            priority: 10, // High priority
            batchSize: 1
          })
        } catch (colorError) {
          // Continue with switch even if color preload fails
        }
      }

      // Step 2: Perform the company switch
      const response = await fetch('/api/company/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      })

      const result = await response.json()

      if (!result.success) {
        const errorMessage = result.error || 'Failed to switch company'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      }

      // Step 3: Update context with new company
      if (result.data?.company) {
        setCurrentBusinessId(result.data.company.business_id)
        
        // Step 4: Store colors in localStorage before reload for immediate availability
        if (targetCompany.avatar_url) {
          try {
            const extractedColors = await extractColors(targetCompany.avatar_url, companyId)
            // Colors are automatically cached by the extraction system
          } catch (extractionError) {
          }
        }
        
        // Step 5: Reload page with new business context
        // Colors should be available immediately from cache
        window.location.reload()
      }

      return { success: true }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    switchCompany,
    isLoading,
    error
  }
}

/**
 * Enhanced business switching with batch color preloading
 */
export async function preloadAllBusinessColors(businesses: BusinessSwitcherData[]): Promise<void> {
  const imageUrls = businesses
    .filter(b => b.avatar_url)
    .map(b => b.avatar_url!)

  if (imageUrls.length === 0) return

  try {
    
    await preloadColors(imageUrls, {
      priority: -1, // Low priority background preloading
      batchSize: 2 // Process 2 at a time to avoid overwhelming
    })
    
  } catch (error) {
  }
}