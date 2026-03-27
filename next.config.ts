import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Puppeteer and Chromium must run in Node.js runtime, not Edge
    serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'puppeteer'],
  },
}

export default nextConfig
