'use client'

import { ReactNode } from 'react'

type MetallicType = 'diamond' | 'gold' | 'silver' | 'bronze'

interface PremiumMetallicCardProps {
  type: MetallicType
  children?: ReactNode
  className?: string
}

const getMetallicStyles = (type: MetallicType) => {
  const baseStyles = `
    rounded-2xl p-3 transition-all duration-500 ease-out
    transform hover:-translate-y-2 hover:scale-[1.02]
    relative overflow-hidden group cursor-default
    backdrop-blur-sm
  `

  switch (type) {
    case 'diamond':
      return {
        container: `${baseStyles}
          bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-white/95
          border-2 border-transparent
          shadow-xl shadow-slate-300/60
          hover:shadow-2xl hover:shadow-blue-400/60
          ring-1 ring-blue-300/30
          before:absolute before:inset-0 before:rounded-2xl
          before:bg-gradient-to-r before:from-blue-300/15 before:via-slate-200/25 before:to-white/15
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
          after:absolute after:inset-0 after:rounded-2xl
          after:bg-gradient-to-br after:from-transparent after:via-blue-100/10 after:to-slate-100/15
        `,
        border: `
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-slate-300 via-blue-300 to-slate-400
          p-[2px]
          shadow-inner shadow-blue-400/40
        `,
        innerBorder: `
          absolute inset-[2px] rounded-[14px]
          bg-gradient-to-br from-slate-50/98 via-blue-50/98 to-white/98
        `,
        shimmer: `
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-blue-200/40 to-transparent
          transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]
          transition-all duration-1000 ease-out
        `
      }

    case 'gold':
      return {
        container: `${baseStyles}
          bg-gradient-to-br from-yellow-50/90 via-amber-50/90 to-yellow-100/90
          border-2 border-transparent
          shadow-xl shadow-yellow-200/40
          hover:shadow-2xl hover:shadow-yellow-300/50
          ring-1 ring-yellow-400/20
          before:absolute before:inset-0 before:rounded-2xl
          before:bg-gradient-to-r before:from-yellow-400/10 before:via-amber-300/20 before:to-yellow-500/10
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
          after:absolute after:inset-0 after:rounded-2xl
          after:bg-gradient-to-br after:from-transparent after:via-yellow-200/5 after:to-amber-200/10
        `,
        border: `
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500
          p-[2px]
          shadow-inner shadow-yellow-600/30
        `,
        innerBorder: `
          absolute inset-[2px] rounded-[14px]
          bg-gradient-to-br from-yellow-50/95 via-amber-50/95 to-yellow-100/95
        `,
        shimmer: `
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent
          transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]
          transition-all duration-1000 ease-out
        `
      }

    case 'silver':
      return {
        container: `${baseStyles}
          bg-gradient-to-br from-slate-50/90 via-gray-50/90 to-slate-100/90
          border-2 border-transparent
          shadow-xl shadow-slate-200/40
          hover:shadow-2xl hover:shadow-slate-300/50
          ring-1 ring-slate-400/20
          before:absolute before:inset-0 before:rounded-2xl
          before:bg-gradient-to-r before:from-slate-400/10 before:via-gray-300/20 before:to-slate-500/10
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
          after:absolute after:inset-0 after:rounded-2xl
          after:bg-gradient-to-br after:from-transparent after:via-slate-200/5 after:to-gray-200/10
        `,
        border: `
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-slate-400 via-gray-400 to-slate-500
          p-[2px]
          shadow-inner shadow-slate-600/30
        `,
        innerBorder: `
          absolute inset-[2px] rounded-[14px]
          bg-gradient-to-br from-slate-50/95 via-gray-50/95 to-slate-100/95
        `,
        shimmer: `
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-slate-300/30 to-transparent
          transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]
          transition-all duration-1000 ease-out
        `
      }

    case 'bronze':
      return {
        container: `${baseStyles}
          bg-gradient-to-br from-amber-50/90 via-orange-50/90 to-red-50/90
          border-2 border-transparent
          shadow-xl shadow-amber-200/40
          hover:shadow-2xl hover:shadow-orange-300/50
          ring-1 ring-orange-400/20
          before:absolute before:inset-0 before:rounded-2xl
          before:bg-gradient-to-r before:from-amber-600/10 before:via-orange-400/20 before:to-red-400/10
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
          after:absolute after:inset-0 after:rounded-2xl
          after:bg-gradient-to-br after:from-transparent after:via-orange-200/5 after:to-red-200/10
        `,
        border: `
          absolute inset-0 rounded-2xl
          bg-gradient-to-r from-amber-600 via-orange-500 to-red-600
          p-[2px]
          shadow-inner shadow-orange-700/30
        `,
        innerBorder: `
          absolute inset-[2px] rounded-[14px]
          bg-gradient-to-br from-amber-50/95 via-orange-50/95 to-red-50/95
        `,
        shimmer: `
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-orange-300/30 to-transparent
          transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]
          transition-all duration-1000 ease-out
        `
      }
  }
}

export function PremiumMetallicCard({ type, children, className = '' }: PremiumMetallicCardProps) {
  const styles = getMetallicStyles(type)

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Metallic Border */}
      <div className={styles.border}>
        <div className={styles.innerBorder} />
      </div>
      
      {/* Shimmer Effect */}
      <div className={styles.shimmer} />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}