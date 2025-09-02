'use client'

interface LoginLogoProps {
  className?: string
}

export default function LoginLogo({ className = '' }: LoginLogoProps) {
  return (
    <img
      src="/images/DominateLocalLeadsLogoLogIn.webp"
      alt="Dominate Local Leads AI"
      className={`${className} mx-auto h-auto max-h-24 object-contain drop-shadow-2xl`}
      style={{ 
        maxHeight: '96px', 
        width: 'auto',
        filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))'
      }}
    />
  )
}