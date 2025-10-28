import LeadHistoryClient from '@/components/LeadHistoryClient';

export const dynamic = 'force-dynamic';

interface LeadHistoryPageProps {
  params: { permalink: string; business_id: string };
}

/**
 * Lead History page for permalink-based routes
 * Uses cached authentication data from AuthDataProvider
 * Eliminates redundant getAuthenticatedUserFromRequest() call
 */
export default function LeadHistoryPage({
  params
}: LeadHistoryPageProps) {
  console.log('[LEAD_HISTORY_PAGE] Rendering with cached auth data');

  // No server-side auth calls needed - data comes from AuthDataProvider
  // All authentication and business validation is handled by parent layout

  return <LeadHistoryClient />;
}
