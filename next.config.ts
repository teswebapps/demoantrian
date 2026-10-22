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
};

export default nextConfig;