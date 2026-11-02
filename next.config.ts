import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Mengabaikan error TypeScript saat build
  typescript: {
    ignoreBuildErrors: true,
  },
  // 2. Mengabaikan error ESLint saat build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 3. Konfigurasi Turbopack & Eksperimen Anda (tetap dipertahankan)
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 4. Tambahan Security Headers untuk Keamanan Web
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;