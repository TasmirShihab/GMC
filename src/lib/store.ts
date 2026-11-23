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
  setIntro: (intro: IntroPhase) => void
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
  setIntro: (intro) => set({ intro }),
  setProfile: (p) => set(p),
  setTier: (tier) => set({ tier }),
  setActiveChapter: (activeChapter) => set({ activeChapter }),
}))
