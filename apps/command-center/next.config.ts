import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Transpile local workspace packages
  transpilePackages: ['@act/intel'],

  // Monorepo root for file tracing (two levels up: apps/command-center → repo root)
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Include repo-root wiki/ in the Vercel serverless bundle so wiki-files.ts
  // can read canonical markdown + status at runtime. Globs are relative to this
  // Next.js project root (apps/command-center/).
  outputFileTracingIncludes: {
    '/api/wiki/**/*': ['../../wiki/**/*'],
    '/wiki': ['../../wiki/**/*'],
  },

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
