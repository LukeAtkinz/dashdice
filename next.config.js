// Next.js image optimization configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Enable image optimization
    domains: ['www.dashdice.gg', 'dashdice.gg'],
    formats: ['image/avif', 'image/webp'],
    // Define responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable static image optimization
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  // Optimize bundle size
  webpack: (config, { dev, isServer }) => {
    // Split chunks for better caching
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          // Framer Motion separate chunk (lazy loaded)
          framerMotion: {
            name: 'framer-motion',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            priority: 30,
            reuseExistingChunk: true
          }
        }
      }
    }
    return config
  },
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Enable swc minification
    swcMinify: true
  },
  // Compress responses
  compress: true,
  // Enable static optimization
  trailingSlash: false,
  // PWA optimization
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig