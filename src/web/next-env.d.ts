/// <reference types="next" /> // @version 14.0.0
/// <reference types="next/image-types/global" /> // @version 14.0.0

// This file is automatically generated by Next.js and should not be edited.
// It provides TypeScript definitions for Next.js features and functionality.

// Augment the ProcessEnv interface in the global namespace
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test'
      readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
      readonly NEXT_PUBLIC_API_URL: string
      readonly NEXT_PUBLIC_GOOGLE_MAPS_KEY: string
      readonly NEXT_PUBLIC_SENTRY_DSN: string
      readonly NEXT_PUBLIC_ENVIRONMENT: string
      [key: `NEXT_PUBLIC_${string}`]: string | undefined
    }
  }
}

// Ensure this is treated as a module
export {}