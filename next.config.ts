import type { NextConfig } from "next";

// Note: next.config.ts runs at build time, so we need to access env vars directly
// The config service is validated at runtime, so we use process.env here with defaults
const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  /* Compiler options */
  reactStrictMode: true,
  
  /* Rewrites - proxy external APIs */
  async rewrites() {
    return [
      // Proxy FastTrak API through Next.js API routes
      // This is handled by the /api/fasttrak/[...path] route handler
    ];
  },

  /* Redirects - permanent and temporary redirects */
  async redirects() {
    return [
      // Permanent redirects (308)
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      // Temporary redirects (307)
      {
        source: '/signin',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/signout',
        destination: '/api/auth/signout',
        permanent: false,
      },
    ];
  },

  /* Headers - add security and CORS headers */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
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
        // CORS headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: nextAuthUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
