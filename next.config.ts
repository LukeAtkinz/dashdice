import type { NextConfig } from "next";

// BUILD_ID to force cache invalidation - v2.0.0
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons', 'framer-motion'],
  },
  // Turbopack configuration (stable as of Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  poweredByHeader: false,
  compress: true,
  output: 'standalone',
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow embedding in Capacitor iOS app
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          // Allow embedding from capacitor:// and file:// origins
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' capacitor: file: ionic: http: https:;",
          },
        ],
      },
    ];
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
  // Only apply webpack config when not using Turbopack
  ...(!process.env.TURBOPACK && {
    webpack: (config, { dev, isServer }) => {
      // Optimize bundle size for production
      if (!dev && !isServer) {
        // FORCE NEW VENDOR HASH: Add timestamp to chunk naming to force CDN invalidation
        config.output.chunkFilename = config.output.chunkFilename || '[name]-[chunkhash].js';
        
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            firebase: {
              name: `firebase-${Date.now()}`,
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            vendor: {
              name: `vendor-${Date.now()}`,
              test: /[\\/]node_modules[\\/]/,
              chunks: 'all',
              priority: 10,
            },
          },
        };
      }
      
      // Ignore large files during build
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/public/Design Elements/**',
          '**/ReadMes/**',
          '**/Reference/**',
        ],
      };
      
      return config;
    },
  }),
};

export default withBundleAnalyzer(nextConfig);
