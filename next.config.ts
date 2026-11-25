import type { NextConfig } from 'next'

/**
 * NEXT_OUTPUT=export makes a fully static build in out/ (used by the Blocks Release Dockerfile, served by
 * nginx). Without it (local dev, Vercel) the app builds the normal way.
 */
const staticExport = process.env.NEXT_OUTPUT === 'export'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
  // Dev-only Next.js badge: bottom-left, beside the hero's sound toggle (which steps right of it in dev),
  // so it never covers the floating stupa bottom-right.
  devIndicators: { position: 'bottom-left' },
  // three ships modern ESM that some tooling still needs transpiled.
  transpilePackages: ['three'],
  ...(staticExport ? {} : { images: { formats: ['image/avif', 'image/webp'] } }),
  // In the static export these cache rules live in nginx.conf instead (headers() needs a Next server).
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [
            {
              // 3D assets and decoders are content-hashed by name; cache them hard.
              source: '/:dir(models|textures|decoders|video)/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
          ]
        },
      }),
}

export default nextConfig
