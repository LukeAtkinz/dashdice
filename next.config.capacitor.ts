import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Check if building for Capacitor (mobile apps)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
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
  // Configure for Capacitor or regular deployment
  ...(isCapacitorBuild ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    }
  } : {
    output: 'standalone',
    images: {
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 31536000,
    }
  }),
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
  // Only apply webpack config when not using Turbopack
  ...(!process.env.TURBOPACK && {
    webpack: (config, { dev, isServer }) => {
      // Optimize bundle size for production
      if (!dev && !isServer) {
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            firebase: {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            vendor: {
              name: 'vendor',
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
