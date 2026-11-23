import tunnel from 'tunnel-rat'

/**
 * Bridges React trees: anything inside <stage.In> (rendered from DOM components) is mounted
 * inside the single persistent <Canvas> via <stage.Out>. This is how a page section "owns" its
 * 3D without creating its own WebGL context.
 */
export const stage = tunnel()
