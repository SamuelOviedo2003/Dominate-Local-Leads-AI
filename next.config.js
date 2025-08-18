const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable verbose logging for debugging deployment issues
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Enable standalone output for optimal Docker deployment
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  
  // Image optimization configuration
  images: {
    domains: ['maps.googleapis.com', 'maps.google.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.google.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    // Enable optimization for better performance
    minimumCacheTTL: 60,
    // Disable optimization for Google Maps API images to avoid CORS issues
    unoptimized: false,
    // Add loader for external images
    loader: 'default',
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
      {
        // Specific headers for API routes and external image handling
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        // Headers for external image loading
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
    ]
  },
  
  // Webpack optimizations for production deployment
  webpack: (config, { dev, isServer, buildId }) => {
    // Add explicit alias mappings for module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/contexts': path.resolve(__dirname, 'src/contexts'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/app': path.resolve(__dirname, 'src/app'),
    }
    
    // Add module resolution extensions for better compatibility
    config.resolve.extensions = [
      '.ts',
      '.tsx', 
      '.js',
      '.jsx',
      '.mjs',
      '.json',
      ...config.resolve.extensions
    ]
    
    // Handle client-side only modules for server builds
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('colorthief')
      
      // Add fallbacks for Node.js modules in Edge runtime
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Production optimizations for client builds
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true
      
      // Minimize bundle size
      config.optimization.sideEffects = false
      
      // Better module ID generation for consistent builds
      config.optimization.moduleIds = 'deterministic'
    }
    
    // Handle case sensitivity issues for Linux deployment environments
    config.resolve.symlinks = false
    
    // Add better error reporting for missing modules
    if (!dev) {
      config.stats = {
        ...config.stats,
        errorDetails: true,
        moduleTrace: true,
      }
    }
    
    return config
  },
}

module.exports = nextConfig