'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import ImageWithFallback from '@/components/ImageWithFallback';

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
}

export default function LeadHistoryClient() {
  const { availableBusinesses, currentBusinessId } = useBusinessContext();
  const [leads, setLeads] = useState<LeadHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [total, setTotal] = useState(0);

  // Fetch lead history
  useEffect(() => {
    fetchLeadHistory();
  }, [searchTerm, selectedBusinessId]);

  const fetchLeadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (selectedBusinessId !== 'all') {
        params.append('business_id', selectedBusinessId);
      }

      const response = await fetch(`/api/leads/history?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch lead history');
      }

      const data = await response.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching lead history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get stage label
  const getStageLabel = (stage: number) => {
    const stageMap: { [key: number]: string } = {
      40: 'Closed',
      50: 'Review Done',
      88: 'Bad Number',
      99: 'Not Interested',
      100: 'Email Campaign',
    };
    return stageMap[stage] || `Stage ${stage}`;
  };

  // Get stage color
  const getStageColor = (stage: number) => {
    const colorMap: { [key: number]: string } = {
      40: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      50: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      88: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      99: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      100: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colorMap[stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            {/* Business Filter */}
            <div className="md:w-64 relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">All Businesses</option>
                {availableBusinesses.map((business) => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Total {total} record{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No lead history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {leads.map((lead) => (
                    <tr
                      key={lead.lead_id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {lead.business_avatar_url ? (
                              <ImageWithFallback
                                src={lead.business_avatar_url}
                                alt={lead.business_name || 'Business'}
                                className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                                fallbackBehavior="placeholder"
                                fallbackText={lead.business_name?.charAt(0) || 'B'}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold border-2 border-gray-200 dark:border-slate-600">
                                {lead.business_name ? lead.business_name.charAt(0).toUpperCase() : 'B'}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {lead.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatPhoneNumber(lead.phone)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                          {lead.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                          {getStageLabel(lead.stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
