'use client'

import { Suspense } from 'react'
import { BarChart3, Users, Phone, TrendingUp, Calendar, MessageSquare } from 'lucide-react'

// Loading component for dashboard content
function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border h-80">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border h-80">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Dashboard Stats Card Component
interface StatsCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  trendDirection?: 'up' | 'down'
}

function StatsCard({ title, value, icon: Icon, trend, trendDirection }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 flex items-center space-x-1 ${
              trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 ${
                trendDirection === 'down' ? 'rotate-180' : ''
              }`} />
              <span>{trend}</span>
            </p>
          )}
        </div>
        <div className="bg-brand-orange-50 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-brand-orange-600" />
        </div>
      </div>
    </div>
  )
}

// Placeholder chart component
function PlaceholderChart({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chart visualization coming soon</p>
          <p className="text-gray-400 text-xs mt-1">Data will be integrated with backend</p>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
function DashboardContent() {
  // Mock data - will be replaced with real data from backend
  const stats = [
    {
      title: 'Total Leads',
      value: '1,234',
      icon: Users,
      trend: '+12% from last month',
      trendDirection: 'up' as const
    },
    {
      title: 'Active Calls',
      value: '89',
      icon: Phone,
      trend: '+5% from yesterday',
      trendDirection: 'up' as const
    },
    {
      title: 'Conversion Rate',
      value: '24.5%',
      icon: TrendingUp,
      trend: '+2.1% from last month',
      trendDirection: 'up' as const
    },
    {
      title: 'Appointments',
      value: '156',
      icon: Calendar,
      trend: '-3% from last week',
      trendDirection: 'down' as const
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to your lead management overview. Track your performance and manage your pipeline.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendDirection={stat.trendDirection}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PlaceholderChart title="Lead Sources & Performance" />
        <PlaceholderChart title="Monthly Revenue Trends" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-brand-orange-600" />
          <span>Recent Activity</span>
        </h3>
        <div className="space-y-4">
          {[
            { action: 'New lead received', detail: 'John Smith - Kitchen Remodel', time: '2 min ago' },
            { action: 'Call completed', detail: 'Sarah Johnson - Follow-up scheduled', time: '15 min ago' },
            { action: 'Appointment booked', detail: 'Mike Davis - Site visit on Friday', time: '1 hour ago' },
            { action: 'Lead qualified', detail: 'Emma Wilson - High priority prospect', time: '2 hours ago' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.detail}</p>
              </div>
              <p className="text-sm text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-brand-orange-50 to-brand-orange-100 rounded-xl p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'View New Leads', href: '/new-leads', icon: Users },
            { name: 'Schedule Calls', href: '/incoming-calls', icon: Phone },
            { name: 'Sales Reports', href: '/salesman', icon: BarChart3 },
            { name: 'FB Analytics', href: '/fb-analysis', icon: TrendingUp }
          ].map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="bg-white p-4 rounded-lg hover:shadow-md transition-all duration-300 text-center group"
            >
              <action.icon className="w-6 h-6 text-brand-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900">{action.name}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main page export
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  )
}