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
}

export default nextConfig
