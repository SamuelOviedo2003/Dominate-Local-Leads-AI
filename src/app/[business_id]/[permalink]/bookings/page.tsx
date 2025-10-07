import { BookingsClientOptimized } from '@/components/BookingsClientOptimized'

export const dynamic = 'force-dynamic'

interface PermalinkBookingsPageProps {
  params: { permalink: string }
}

/**
 * Optimized permalink-based bookings page
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function PermalinkBookingsPage({
  params
}: PermalinkBookingsPageProps) {
  console.log('[BOOKINGS_PAGE_OPTIMIZED] Rendering bookings with cached auth data')

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <BookingsClientOptimized />
}