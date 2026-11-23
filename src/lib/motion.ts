/**
 * Motion tokens. The brief asks for "breath-paced" motion: slow, eased-out, played once.
 * Use these in GSAP (by name) and in useFrame (as numbers) so DOM and WebGL move as one.
 */
export const EASE = {
  /** Default reveal: 400–600 ms ease-out. */
  breath: '0.22, 0.61, 0.36, 1',
  /** Long settles for camera moves and big reveals. */
  settle: '0.16, 1, 0.3, 1',
} as const

export const DURATION = {
  fast: 0.4,
  base: 0.6,
  slow: 1.2,
  /** Camera and world transitions. */
  world: 1.8,
} as const

/** Damping factors for maath `easing.damp*` inside useFrame (seconds to ~settle). */
export const DAMP = {
  camera: 0.35,
  object: 0.25,
  pointer: 0.15,
} as const
