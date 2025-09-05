import { Communication, CallWindow } from '@/types/leads'

interface CommunicationWithCallWindow extends Communication {
  matchedCallWindow?: CallWindow | null
}

/**
 * Matches communications with their corresponding call windows based on various criteria
 */
export function matchCommunicationsWithCallWindows(
  communications: Communication[], 
  callWindows: CallWindow[]
): CommunicationWithCallWindow[] {
  if (!communications?.length || !callWindows?.length) {
    return communications?.map(comm => ({ ...comm, matchedCallWindow: null })) || []
  }

  // Create a map for efficient call window lookup by call number
  const callWindowMap = new Map<number, CallWindow>()
  callWindows.forEach(window => {
    callWindowMap.set(window.callNumber, window)
  })

  // Filter call windows that actually have timestamps (were called) for fallback timestamp matching
  const calledWindows = callWindows.filter(window => window.calledAt !== null)

  return communications.map(communication => {
    let matchedWindow: CallWindow | null = null

    // PRIORITY 1: Direct matching using call_window field (1-6)
    if (communication.call_window && communication.call_window >= 1 && communication.call_window <= 6) {
      matchedWindow = callWindowMap.get(communication.call_window) || null
    }
    
    // PRIORITY 2: Fallback timestamp matching for call-type communications without call_window
    else if (communication.message_type.toLowerCase() === 'call') {
      // Find the call window with the closest timestamp
      let closestWindow: CallWindow | null = null
      let smallestTimeDiff = Infinity

      for (const window of calledWindows) {
        if (!window.calledAt) continue

        const commTime = new Date(communication.created_at).getTime()
        const windowTime = new Date(window.calledAt).getTime()
        
        // Calculate absolute time difference in milliseconds
        const timeDiff = Math.abs(commTime - windowTime)
        
        // Consider a match if within 5 minutes (300,000 ms) and closer than any previous match
        if (timeDiff <= 300000 && timeDiff < smallestTimeDiff) {
          smallestTimeDiff = timeDiff
          closestWindow = window
        }
      }

      matchedWindow = closestWindow
    }

    return {
      ...communication,
      matchedCallWindow: matchedWindow
    }
  })
}

/**
 * Determines if a communication should display a special tier logo instead of call number
 */
export function shouldShowSpecialTierLogo(communication: CommunicationWithCallWindow): boolean {
  return !!(
    communication.matchedCallWindow?.callNumber === 1 && 
    communication.matchedCallWindow?.medalTier
  )
}

/**
 * Gets the display information for a communication's call window logo
 */
export function getCallWindowDisplayInfo(communication: CommunicationWithCallWindow) {
  const callWindow = communication.matchedCallWindow

  if (!callWindow) {
    return null
  }

  const isSpecialTier = shouldShowSpecialTierLogo(communication)

  return {
    callNumber: callWindow.callNumber,
    medalTier: callWindow.medalTier,
    isSpecialTier,
    displayText: isSpecialTier 
      ? `Call ${callWindow.callNumber}` 
      : `Call ${callWindow.callNumber}`
  }
}