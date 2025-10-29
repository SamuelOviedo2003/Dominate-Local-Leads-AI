import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { createCookieClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface LeadHistoryRecord {
  lead_id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  stage: number;
  business_id: number;
  business_name: string | null;
  business_avatar_url: string | null;
  business_permalink: string | null;
}

interface BusinessClient {
  business_id: number;
  company_name: string;
  avatar_url: string | null;
  permalink: string | null;
}

interface LeadFromDB {
  lead_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  stage: number;
  business_id: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using the proper auth method
    const { user } = await authenticateRequest(request);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const businessFilter = searchParams.get('business_id');

    // Get accessible business IDs from user's accessible businesses
    const accessibleBusinessIds = user.accessibleBusinesses?.map(b =>
      typeof b.business_id === 'string' ? parseInt(b.business_id) : b.business_id
    ) || [];

    // If no accessible businesses, return empty array
    if (accessibleBusinessIds.length === 0) {
      return NextResponse.json({ leads: [], total: 0 });
    }

    const supabase = createCookieClient();

    // Query 1: Fetch business information for all accessible businesses
    const { data: businesses, error: businessError } = await supabase
      .from('business_clients')
      .select('business_id, company_name, avatar_url, permalink')
      .in('business_id', accessibleBusinessIds);

    if (businessError) {
      console.error('Error fetching businesses:', businessError);
      return NextResponse.json({ error: 'Failed to fetch business information' }, { status: 500 });
    }

    // Create a business map for quick lookup
    const businessMap: Record<number, BusinessClient> = {};
    businesses?.forEach((business: BusinessClient) => {
      businessMap[business.business_id] = business;
    });

    // Query 2: Build the leads query with first_name and last_name
    let query = supabase
      .from('leads')
      .select('lead_id, first_name, last_name, phone, email, created_at, stage, business_id', { count: 'exact' })
      .gte('stage', 40)
      .in('business_id', accessibleBusinessIds)
      .order('created_at', { ascending: false });

    // Apply business filter if provided
    if (businessFilter) {
      const businessId = parseInt(businessFilter);
      if (!isNaN(businessId) && accessibleBusinessIds.includes(businessId)) {
        query = query.eq('business_id', businessId);
      }
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: leads, error: leadsError, count } = await query;

    if (leadsError) {
      console.error('Error fetching lead history:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch lead history' }, { status: 500 });
    }

    // Transform the data to match the expected format, merging business names and logos
    const transformedLeads: LeadHistoryRecord[] = (leads || []).map((lead: LeadFromDB) => {
      const businessInfo = businessMap[lead.business_id];
      // Combine first_name and last_name into a single name field
      const fullName = [lead.first_name, lead.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || null;

      return {
        lead_id: lead.lead_id,
        name: fullName,
        phone: lead.phone,
        email: lead.email,
        created_at: lead.created_at,
        stage: lead.stage,
        business_id: lead.business_id,
        business_name: businessInfo?.company_name || 'Unknown Business',
        business_avatar_url: businessInfo?.avatar_url || null,
        business_permalink: businessInfo?.permalink || null,
      };
    });

    return NextResponse.json({
      leads: transformedLeads,
      total: count || 0,
    });
  } catch (error) {
    console.error('Unexpected error in lead history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
