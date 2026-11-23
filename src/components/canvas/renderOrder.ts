/**
 * Explicit render order inside the single canvas (useFrame priorities, low → high):
 *   0.5 RESET  restore the full-canvas viewport (drei Views leave it at their own box)
 *   1  STAGE  the global world, rendered by <StageRender> or by the EffectComposer when effects are on
 *   2  VIEWS  DOM-tracked <SectionView>s, scissored on top
 * Any useFrame with priority > 0 takes over R3F's automatic render, so the order must be explicit.
 */
export const RENDER_PRIORITY = { reset: 0.5, stage: 1, views: 2 } as const

/** Set by <Effects> while an EffectComposer is mounted, so the stage isn't rendered twice. */
export const renderFlags = { composer: false }
