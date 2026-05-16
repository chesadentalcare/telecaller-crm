/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable the Next.js dev tools indicator (the small "N" badge that appears
  // in the bottom-left during dev). Doesn't affect production.
  devIndicators: false,
  // Aggressive tree-shaking for packages that re-export many symbols. Without
  // this, a single `import { Phone } from 'lucide-react'` can pull in the whole
  // index file on first pass. Especially useful here — we import 60+ icons.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
    ],
  },
}

export default nextConfig
