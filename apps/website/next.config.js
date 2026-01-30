/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploads-ssl.webflow.com",
      },
      {
        protocol: "https",
        hostname: "uploads.webflow.com",
      },
      {
        protocol: "https",
        hostname: "assets.website-files.com",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
      {
        protocol: "https",
        hostname: "tednluwflfhxyucgwigh.supabase.co",
      },
    ],
  },
  // Exclude admin-wiki subdirectory (separate Next.js app)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/admin-wiki/**', '**/node_modules/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
