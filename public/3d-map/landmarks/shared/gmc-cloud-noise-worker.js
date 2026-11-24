// GMC clouds · noise worker (1.3.0): builds the cloud noise volumes off the main thread, posts them
// (with progress), then caches them in IndexedDB. Spawned by buildCloudNoise() in gmc-clouds.js.
import { cloudNoiseData } from './gmc-cloud-noise.js';
import { idbOpen, idbPut } from './gmc-recipes.js';
self.onmessage = async ({ data: { size, detail, cacheKey } }) => {
  try {
    const d = cloudNoiseData({ size, detail, onProgress: f => self.postMessage({ progress: f }) });
    self.postMessage({ data: d });                                              // copied: kept here for the cache
    const db = await idbOpen().catch(() => null); if (db) await idbPut(db, cacheKey, d);
    self.postMessage({ stored: true });
  } catch (e) { self.postMessage({ error: String(e?.message || e) }); }
};
