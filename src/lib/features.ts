/**
 * Section switches for the home page. A section that is switched off is not rendered, but all of its
 * code, styles, content and assets stay in the repo, so it can be brought back by flipping one value.
 *
 * To bring a section back: set its value to `true`, save, and run `pnpm check`.
 */
export const features = {
  /**
   * "The weave opens onto the city": the GMC mark with video in its four quadrants and the river,
   * between the Welcome and About sections. Hidden 24 Nov 2026 at the client's request, to come back later.
   * Code: src/components/weave/ (Weave.tsx, Weave.module.css, mark.ts) · copy: `weave` in src/content/home.ts.
   */
  weave: false,
} as const
