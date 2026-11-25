import { create } from 'zustand'

import type { ChapterId } from '@/story/chapters'

/**
 * Quality tiers decide how much WebGL a device gets.
 * 0 = no WebGL (static fallback), 1 = light, 2 = standard, 3 = full.
 * The brief's guardrail: main content first, 3D only on capable devices, phones get a lighter story.
 */
export type QualityTier = 0 | 1 | 2 | 3

export interface QualityProfile {
  dpr: [number, number]
  antialias: boolean
  postprocessing: boolean
  shadows: boolean
}

export const QUALITY: Record<QualityTier, QualityProfile> = {
  0: { dpr: [1, 1], antialias: false, postprocessing: false, shadows: false },
  1: { dpr: [1, 1.25], antialias: false, postprocessing: false, shadows: false },
  2: { dpr: [1, 1.75], antialias: true, postprocessing: true, shadows: false },
  3: { dpr: [1, 2], antialias: true, postprocessing: true, shadows: true },
}

/** Home intro: 'loading' (counter), 'reveal' (dissolving into the hero), 'done'. */
export type IntroPhase = 'loading' | 'reveal' | 'done'

interface ExperienceState {
  /** null while the device is still being profiled. */
  tier: QualityTier | null
  reducedMotion: boolean
  /** True when the user asked for no smooth scroll / heavy motion, or on Save-Data. */
  lite: boolean
  /** Low-frequency: which chapter is centred in the viewport. Use for UI, not animation. */
  activeChapter: ChapterId | null
  debug: boolean
  intro: IntroPhase
  /** The full-screen 3D map layer is open: the home page's own 3D and scroll stay paused under it. */
  mapOpen: boolean
  /** How many 3D pieces (<Stage> / <SectionView>) are mounted; the canvas only draws frames while > 0. */
  scenes: number
  addScene: () => void
  removeScene: () => void
  setIntro: (intro: IntroPhase) => void
  setMapOpen: (open: boolean) => void
  setProfile: (p: { tier: QualityTier; reducedMotion: boolean; lite: boolean; debug: boolean }) => void
  setTier: (tier: QualityTier) => void
  setActiveChapter: (id: ChapterId | null) => void
}

export const useExperience = create<ExperienceState>((set) => ({
  tier: null,
  reducedMotion: false,
  lite: false,
  activeChapter: null,
  debug: false,
  intro: 'loading',
  mapOpen: false,
  scenes: 0,
  addScene: () => set((s) => ({ scenes: s.scenes + 1 })),
  removeScene: () => set((s) => ({ scenes: Math.max(0, s.scenes - 1) })),
  setIntro: (intro) => set({ intro }),
  setMapOpen: (mapOpen) => set({ mapOpen }),
  setProfile: (p) => set(p),
  setTier: (tier) => set({ tier }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
}))
