import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev-only Next.js badge: bottom-left, beside the hero's sound toggle (which steps right of it in dev),
  // so it never covers the floating stupa bottom-right.
  devIndicators: { position: 'bottom-left' },
  // three ships modern ESM that some tooling still needs transpiled.
  transpilePackages: ['three'],
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        // 3D assets and decoders are content-hashed by name; cache them hard.
        source: '/:dir(models|textures|decoders|video)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
