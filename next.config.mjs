/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → emits a self-contained `out/` folder of HTML/JS that any
  // static host (nginx) can serve. The app is a client-rendered SPA (no API
  // routes / middleware / server actions), so export is safe. Requires
  // images.unoptimized (set below).
  output: 'export',
  // Each route becomes a folder with index.html (e.g. /login/index.html) — the
  // friendliest layout for a plain static file server / nginx try_files.
  trailingSlash: true,
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
