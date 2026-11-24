// ─────────────────────────────────────────────────────────────────────────────
// GMC kit · texture worker (1.9.0). Paints one recipe (or the foliage atlas) off the main thread,
// posts the result as ImageBitmaps (pixel arrays for foliage), then stores PNGs in IndexedDB so
// the next visit / the next landmark's iframe decodes instead of repainting. Spawned by
// prepareTextures() in gmc-kit.js; no three.js here.
// ─────────────────────────────────────────────────────────────────────────────
import { RECIPES, createNoise, SEED, foliagePixels, idbOpen, idbPut } from './gmc-recipes.js';

let dbp = null; const db = () => (dbp ??= idbOpen().catch(() => null));
const isCanvas = v => typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas;
const BITMAP = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };

self.onmessage = async ({ data: { id, kind, name, S, opts, cacheKey } }) => {
  try {
    if (kind === 'foliage') {
      const { col, alpha } = foliagePixels(S);
      self.postMessage({ id, foliage: { col, alpha } });                       // copied, so the arrays stay usable here
      const d = await db(); if (d) await idbPut(d, cacheKey, { foliage: { col, alpha } });
      self.postMessage({ id, stored: true }); return;
    }
    const r = RECIPES[name](createNoise(SEED), S, opts), meta = {}, maps = {};
    for (const [k, v] of Object.entries(r)) { if (isCanvas(v)) maps[k] = v; else meta[k] = v; }
    const bitmaps = {}; for (const [k, c] of Object.entries(maps)) bitmaps[k] = await createImageBitmap(c, BITMAP);
    self.postMessage({ id, meta, bitmaps }, Object.values(bitmaps));
    const d = await db();
    if (d) { const blobs = {}; for (const [k, c] of Object.entries(maps)) blobs[k] = await c.convertToBlob({ type: 'image/png' }); await idbPut(d, cacheKey, { meta, blobs }); }
    self.postMessage({ id, stored: true });
  } catch (e) { self.postMessage({ id, error: String(e?.message || e) }); }
};
