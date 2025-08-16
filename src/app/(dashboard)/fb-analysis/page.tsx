'use client'

import { Construction } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function FBAnalysisPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <Construction className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">FB Analysis</h1>
        <p className="text-xl text-gray-600 mb-2">Page Under Construction</p>
        <p className="text-gray-500">
          We're working hard to bring you comprehensive Facebook advertising analytics. Check back soon!
        </p>
      </div>
    </div>
  )
}