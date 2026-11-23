import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
