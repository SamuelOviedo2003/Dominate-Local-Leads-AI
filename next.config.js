/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimal Docker deployment
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  
  // Image optimization configuration
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    // Enable optimization for better performance
    minimumCacheTTL: 60,
  },
  
  // Experimental features for performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Webpack optimizations for production
  webpack: (config, { dev, isServer }) => {
    // Handle client-side only modules
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('colorthief')
    }
    
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true
      
      // Minimize bundle size
      config.optimization.sideEffects = false
    }
    
    return config
  },
}

module.exports = nextConfig