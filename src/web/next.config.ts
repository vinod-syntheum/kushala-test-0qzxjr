import type { NextConfig } from 'next'
import withTM from 'next-transpile-modules' // v10.x
import withBundleAnalyzer from '@next/bundle-analyzer' // v14.x
import { plugins } from './postcss.config'

// Enhance Next.js config with module transpilation
const withTranspileModules = withTM([
  '@stripe/stripe-js',
  '@googlemaps/js-api-loader',
  'react-datepicker',
  'react-dnd'
])

// Enable bundle analysis if ANALYZE env var is set
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true'
})

const nextConfig: NextConfig = {
  // Environment variables with type safety
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID
  },

  // Image optimization configuration
  images: {
    domains: ['s3.amazonaws.com', 'res.cloudinary.com'],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://s3.amazonaws.com https://res.cloudinary.com; connect-src 'self' https://api.stripe.com https://maps.googleapis.com; frame-src 'self' https://js.stripe.com; object-src 'none';"
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          }
        ]
      }
    ]
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Optimization settings
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      },
      minimize: !dev,
      moduleIds: 'deterministic',
      runtimeChunk: 'single'
    }

    return config
  },

  // Experimental features
  experimental: {
    serverActions: true,
    serverComponents: true,
    concurrentFeatures: true,
    scrollRestoration: true,
    optimizeCss: true,
    optimizeImages: true,
    instrumentationHook: true,
    typedRoutes: true
  },

  // Compiler options
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn', 'info']
    },
    styledComponents: true,
    emotion: true,
    reactRemoveProperties: true
  },

  // PostCSS configuration
  postcss: {
    plugins
  },

  // General settings
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  productionBrowserSourceMaps: false,

  // Disable telemetry
  telemetry: false
}

// Compose configurations with module transpilation and bundle analysis
export default withAnalyzer(withTranspileModules(nextConfig))