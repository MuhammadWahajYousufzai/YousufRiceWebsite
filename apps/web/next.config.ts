import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/appwrite", "@repo/types", "@repo/ui", "@repo/utils"],

  // ============================================
  // Next.js 16 Advanced Features
  // ============================================
  // reactCompiler: true,
  // Enable Cache Components with PPR (Partial Prerendering)
  // This enables the new caching model with 'use cache' directive
  // But disable it for API routes to avoid build-time authentication issues
  cacheComponents: true,

  // Configure cache profiles for optimal performance
  cacheLife: {
    // Default profile for most content
    default: {
      stale: 3600, // 1 hour stale time
      revalidate: 86400, // 24 hours revalidation
      expire: 604800, // 7 days expiration
    },
    // For frequently changing content
    frequent: {
      stale: 300, // 5 minutes
      revalidate: 900, // 15 minutes
      expire: 3600, // 1 hour
    },
    // For static content that rarely changes
    max: {
      stale: 86400, // 24 hours
      revalidate: 604800, // 7 days
      expire: 2592000, // 30 days
    },
  },

  // ============================================
  // Image Optimization
  // ============================================
  images: {
    unoptimized: false, // Enable image optimization for caching
    minimumCacheTTL: 2592000, // Cache optimized images for 30 days (in seconds)
    qualities: [20, 75, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yousufricemill.com",
        port: "",
        pathname: "/v1/storage/buckets/**",
      },
    ],
    formats: ["image/avif", "image/webp"], // AVIF first: ~50% smaller than WebP, WebP as fallback
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ============================================
  // Performance & SEO Optimizations
  // ============================================

  // Compress responses for better performance (helps SEO)
  compress: true,

  // Generate ETags for caching
  generateEtags: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // ============================================
  // Turbopack Configuration (Default in Next.js 16)
  // ============================================
  // Turbopack is now the default bundler - no config needed!
  // It provides 5-10x faster builds and hot module replacement
  turbopack: {
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
  },

  webpack(config) {
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ...config.resolve.extensions,
    ];

    return config;
  },

  // ============================================
  // Headers for SEO and Security
  // ============================================
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Service Worker specific headers for PWA
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
