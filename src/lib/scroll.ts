/**
 * Mutable scroll state shared between the DOM and WebGL.
 *
 * Written by Lenis and the <Chapter> ScrollTriggers every frame; read inside useFrame.
 * It is deliberately NOT React state: scroll changes 60–120 times a second, and routing it
 * through React would re-render the tree on every frame.
 */
import type { ChapterId } from '@/story/chapters'

export const scroll = {
  /** Pixels scrolled. */
  y: 0,
  /** 0..1 across the whole page. */
  progress: 0,
  /** Lenis velocity, px per frame. Signed. */
  velocity: 0,
  /** 1 down, -1 up, 0 idle. */
  direction: 0 as -1 | 0 | 1,
}

/** 0..1 progress through each chapter, keyed by chapter id. */
export const chapterProgress: Partial<Record<ChapterId, number>> = {}

/** Pointer in normalised device coords (-1..1), for parallax and hover in 3D. */
export const pointer = { x: 0, y: 0 }

export const getChapterProgress = (id: ChapterId) => chapterProgress[id] ?? 0
