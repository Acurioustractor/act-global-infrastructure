import type { NextConfig } from 'next'
import { resolve } from 'path'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Include mono-repo root so serverless functions can access shared config
  outputFileTracingRoot: resolve(__dirname, '../../'),

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Environment variables for API connection
  // Empty string = use same origin (Next.js API routes)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
}

export default nextConfig
