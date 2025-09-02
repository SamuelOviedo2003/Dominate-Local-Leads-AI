'use client'

interface LoginLogoProps {
  className?: string
}

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className} mx-auto max-h-24`}>
      <div className="text-center px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
        <div className="text-white text-2xl font-bold tracking-wide mb-2">
          DOMINATE LOCAL LEADS AI
        </div>
        <div className="text-white/80 text-sm font-medium tracking-wider">
          LEAD MANAGEMENT SYSTEM
        </div>
        {/* Decorative element */}
        <div className="mt-3 mx-auto w-16 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
      </div>
    </div>
  )
}