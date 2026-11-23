'use client'

import { getGPUTier } from 'detect-gpu'
import { useEffect } from 'react'

import { useExperience, type QualityTier } from '@/lib/store'

function hasWebGL2() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

/**
 * Profiles the device once on load and writes a quality tier to the store.
 * Runs after first paint, so the DOM story is readable before any 3D decision is made.
 * Add `?debug` to the URL for the Leva panel and GPU stats; `?tier=0..3` forces a tier.
 */
export function DeviceProfile() {
  const setProfile = useExperience((s) => s.setProfile)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    // Pages like /lab can switch debug on themselves; never switch it back off here.
    const debug = params.has('debug') || useExperience.getState().debug
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    const lite = reducedMotion || !!saveData

    const forced = params.get('tier')
    if (forced !== null && /^[0-3]$/.test(forced)) {
      setProfile({ tier: Number(forced) as QualityTier, reducedMotion, lite, debug })
      return
    }
    if (!hasWebGL2()) {
      setProfile({ tier: 0, reducedMotion, lite, debug })
      return
    }

    getGPUTier({ benchmarksURL: '/decoders/gpu-benchmarks' })
      .then((gpu) => {
        if (cancelled) return
        let tier = Math.max(1, Math.min(3, gpu.tier)) as QualityTier
        // Phones get the lighter version by default, as in the brief.
        if (gpu.isMobile && tier > 2) tier = 2
        if (saveData) tier = 1
        setProfile({ tier, reducedMotion, lite, debug: debug || useExperience.getState().debug })
      })
      .catch(() => !cancelled && setProfile({ tier: 1, reducedMotion, lite, debug: debug || useExperience.getState().debug }))

    return () => {
      cancelled = true
    }
  }, [setProfile])

  return null
}
