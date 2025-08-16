'use client'

import { LeadMetrics } from '@/components/features/leads/LeadMetrics'
import { AppointmentSetters } from '@/components/features/leads/AppointmentSetters'
import { LeadMetrics as LeadMetricsType, AppointmentSetter } from '@/types/leads'

// Mock data for preview
const mockMetrics: LeadMetricsType = {
  total: 156,
  contacted: 89,
  booked: 23,
  contactRate: 57.1,
  bookingRate: 25.8
}

const mockSetters: AppointmentSetter[] = [
  {
    name: "Sarah Johnson",
    totalLeads: 45,
    contacted: 32,
    booked: 12,
    contactRate: 71.1,
    bookingRate: 37.5,
    totalCallTime: 8640, // 2.4 hours
    avgResponseSpeed: 18.5
  },
  {
    name: "Mike Rodriguez",
    totalLeads: 38,
    contacted: 25,
    booked: 8,
    contactRate: 65.8,
    bookingRate: 32.0,
    totalCallTime: 6300, // 1.75 hours
    avgResponseSpeed: 22.1
  },
  {
    name: "Emily Chen",
    totalLeads: 42,
    contacted: 28,
    booked: 10,
    contactRate: 66.7,
    bookingRate: 35.7,
    totalCallTime: 7200, // 2 hours
    avgResponseSpeed: 15.8
  },
  {
    name: "David Martinez",
    totalLeads: 31,
    contacted: 18,
    booked: 5,
    contactRate: 58.1,
    bookingRate: 27.8,
    totalCallTime: 4800, // 1.33 hours
    avgResponseSpeed: 28.3
  }
]

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Optimized Dashboard Layout Preview
          </h1>
          <p className="text-gray-600">
            Demonstrating the compact 420px height components with improved space utilization
          </p>
        </div>

        {/* Before/After Comparison Info */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Optimization Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-blue-800">Before:</strong>
              <ul className="text-blue-700 mt-1">
                <li>• Component height: 580px</li>
                <li>• Excessive white space</li>
                <li>• Large padding and margins</li>
                <li>• Poor space utilization</li>
              </ul>
            </div>
            <div>
              <strong className="text-blue-800">After:</strong>
              <ul className="text-blue-700 mt-1">
                <li>• Component height: 420px (28% reduction)</li>
                <li>• Compact, clean design</li>
                <li>• Optimized spacing</li>
                <li>• Better scroll functionality</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Optimized Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lead Metrics - Optimized */}
          <LeadMetrics 
            metrics={mockMetrics}
            isLoading={false}
            error={null}
          />

          {/* Appointment Setters - Optimized */}
          <AppointmentSetters 
            setters={mockSetters}
            isLoading={false}
            error={null}
          />
        </div>

        {/* Technical Details */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Improvements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">LeadMetrics Component</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Reduced padding from 6 to 4</li>
                <li>• Decreased spacing between cards</li>
                <li>• Smaller font sizes for numbers</li>
                <li>• Compact margin adjustments</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">AppointmentSetters Component</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Shows 2 items per page (was 3)</li>
                <li>• Reduced card padding</li>
                <li>• Smaller avatar sizes</li>
                <li>• Optimized grid spacing</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Performance Benefits</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 28% height reduction</li>
                <li>• Better screen real estate usage</li>
                <li>• Improved mobile experience</li>
                <li>• Faster visual scanning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}