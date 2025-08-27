'use client'

import { CallWindow } from '@/types/leads'
import { MetallicTierCard } from '@/components/ui/MetallicTierCard'

const MetallicTierDemo = () => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Demo data for all tier types
  const demoWindows: CallWindow[] = [
    {
      callNumber: 1,
      medalTier: 'gold',
      responseTime: '< 1 min',
      calledAt: '2025-08-27T10:00:30Z'
    },
    {
      callNumber: 2,
      medalTier: 'silver',
      responseTime: '1.5 min',
      calledAt: '2025-08-27T10:01:30Z'
    },
    {
      callNumber: 3,
      medalTier: 'bronze',
      responseTime: '3.2 min',
      calledAt: '2025-08-27T10:03:12Z'
    },
    {
      callNumber: 4,
      medalTier: null,
      responseTime: undefined,
      calledAt: '2025-08-27T10:06:00Z',
      status: 'called'
    },
    {
      callNumber: 5,
      medalTier: null,
      responseTime: undefined,
      calledAt: null,
      status: 'No call'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium Metallic Tier Cards Demo</h2>
        <p className="text-gray-600">
          Showcasing the fintech-inspired premium card designs for performance tiers
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {demoWindows.map((window) => (
          <div key={window.callNumber} className="group">
            <MetallicTierCard 
              window={window}
              formatTime={formatTime}
            />
            
            {/* Demo Information */}
            <div className="mt-3 text-sm text-gray-500 text-center">
              {window.medalTier === 'gold' && (
                <div className="space-y-1">
                  <div className="font-medium text-yellow-700">🥇 Gold Tier</div>
                  <div>Response time &lt; 1 minute</div>
                  <div className="text-xs">Premium gold metallic with shimmering effects</div>
                </div>
              )}
              {window.medalTier === 'silver' && (
                <div className="space-y-1">
                  <div className="font-medium text-slate-700">🥈 Silver Tier</div>
                  <div>Response time 1-2 minutes</div>
                  <div className="text-xs">Sleek silver finish with subtle highlights</div>
                </div>
              )}
              {window.medalTier === 'bronze' && (
                <div className="space-y-1">
                  <div className="font-medium text-amber-700">🥉 Bronze Tier</div>
                  <div>Response time 2-5 minutes</div>
                  <div className="text-xs">Warm bronze with rich depth and texture</div>
                </div>
              )}
              {!window.medalTier && window.status === 'called' && (
                <div className="space-y-1">
                  <div className="font-medium text-gray-700">Standard Call</div>
                  <div>No performance tier (5+ min response)</div>
                  <div className="text-xs">Clean standard card design</div>
                </div>
              )}
              {!window.medalTier && window.status === 'No call' && (
                <div className="space-y-1">
                  <div className="font-medium text-gray-500">Not Called</div>
                  <div>No call made yet</div>
                  <div className="text-xs">Waiting state with subtle styling</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Design Features:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Metallic gradients with depth and premium feel</li>
          <li>• Shimmer animations on hover for enhanced interactivity</li>
          <li>• Tier-specific iconography (Crown, Lightning, Clock)</li>
          <li>• Performance thresholds clearly displayed</li>
          <li>• Fintech-inspired card aesthetics with modern shadows</li>
          <li>• Responsive design maintaining elegance across screen sizes</li>
        </ul>
      </div>
    </div>
  )
}

export default MetallicTierDemo