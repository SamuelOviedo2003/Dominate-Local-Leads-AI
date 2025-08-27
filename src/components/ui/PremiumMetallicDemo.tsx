'use client'

import { PremiumMetallicCard } from './PremiumMetallicCard'
import { Sparkles, Award, Medal } from 'lucide-react'

export default function PremiumMetallicDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Premium Metallic Effects
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Elegant metallic border effects inspired by luxury fintech and premium credit card aesthetics
          </p>
        </div>

        {/* Main Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          
          {/* Gold Card */}
          <div className="space-y-4">
            <PremiumMetallicCard type="gold" className="h-64">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/30">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Gold</h3>
                <p className="text-gray-600">Premium shimmering gold with authentic golden tones</p>
              </div>
            </PremiumMetallicCard>
            <div className="text-center">
              <div className="text-sm font-medium text-yellow-700 mb-1">GOLD METALLIC</div>
              <div className="text-xs text-gray-500">Shiny metallic gold with rich, warm tones</div>
            </div>
          </div>

          {/* Silver Card */}
          <div className="space-y-4">
            <PremiumMetallicCard type="silver" className="h-64">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-gray-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-slate-500/30">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Silver</h3>
                <p className="text-gray-600">Polished metallic silver with sophisticated shine</p>
              </div>
            </PremiumMetallicCard>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700 mb-1">SILVER METALLIC</div>
              <div className="text-xs text-gray-500">Clean, sophisticated silver with subtle highlights</div>
            </div>
          </div>

          {/* Bronze Card */}
          <div className="space-y-4 md:col-span-2 xl:col-span-1">
            <PremiumMetallicCard type="bronze" className="h-64">
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-red-700 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-600/30">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Bronze</h3>
                <p className="text-gray-600">Warm bronze with distinct copper and brown undertones</p>
              </div>
            </PremiumMetallicCard>
            <div className="text-center">
              <div className="text-sm font-medium text-orange-700 mb-1">BRONZE METALLIC</div>
              <div className="text-xs text-gray-500">Rich bronze with copper and brown metallic tones</div>
            </div>
          </div>
        </div>

        {/* Minimal Content Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Minimal Content Showcase</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <PremiumMetallicCard type="gold" className="h-40">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">01</div>
                  <div className="text-sm text-gray-600 mt-1">Premium</div>
                </div>
              </div>
            </PremiumMetallicCard>

            <PremiumMetallicCard type="silver" className="h-40">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">02</div>
                  <div className="text-sm text-gray-600 mt-1">Elite</div>
                </div>
              </div>
            </PremiumMetallicCard>

            <PremiumMetallicCard type="bronze" className="h-40">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">03</div>
                  <div className="text-sm text-gray-600 mt-1">Select</div>
                </div>
              </div>
            </PremiumMetallicCard>
          </div>
        </div>

        {/* Text Content Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Text Content Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            
            <PremiumMetallicCard type="gold">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">Premium Service</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Experience the finest quality with our premium offering, featuring comprehensive benefits and priority support.
                </p>
              </div>
            </PremiumMetallicCard>

            <PremiumMetallicCard type="silver">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">Professional Plan</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Perfect for professionals seeking advanced features with reliable performance and dedicated assistance.
                </p>
              </div>
            </PremiumMetallicCard>

            <PremiumMetallicCard type="bronze" className="md:col-span-2 xl:col-span-1">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">Essential Package</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Get started with our essential package, offering solid foundation features with quality support.
                </p>
              </div>
            </PremiumMetallicCard>
          </div>
        </div>

        {/* Technical Features */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Metallic Border Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Authentic Metallic Effects</div>
              <div className="text-sm text-gray-600">Multi-layer gradients with realistic metallic depth and shine</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Premium Animations</div>
              <div className="text-sm text-gray-600">Smooth hover effects with shimmer animations and subtle transforms</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Distinct Color Schemes</div>
              <div className="text-sm text-gray-600">Gold, silver, and bronze with clearly distinguishable tones</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Responsive Design</div>
              <div className="text-sm text-gray-600">Maintains elegance across all screen sizes and devices</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Luxury Aesthetics</div>
              <div className="text-sm text-gray-600">Inspired by premium credit cards and fintech applications</div>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">Reusable Component</div>
              <div className="text-sm text-gray-600">Clean, minimal API focused purely on border effects</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}