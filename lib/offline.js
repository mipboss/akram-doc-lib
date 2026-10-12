// Saving documents on this device for reading without internet (browser only).
// Saved files live in their own cache, apart from the service worker's app cache, so app updates never
// remove them. public/sw.js uses the same name and must keep this cache.
export const FILES = 'pdf-library-files';

export const canSave = () => typeof window !== 'undefined' && 'caches' in window;

// One spelling per link, so "a b.pdf" and "a%20b.pdf" are the same saved file.
const key = (u) => new URL(u).href;

export class SaveError extends Error {}

export async function savedLinks() {
  if (!canSave()) return new Set();
  const cache = await caches.open(FILES);
  return new Set((await cache.keys()).map((r) => r.url));
}

export const isSaved = (links, doc) => links.has(key(doc.url));

async function store(cache, url, type) {
  let res;
  // The file's server must allow this site to read it (CORS); S3 sends nothing back otherwise and fetch throws.
  // no-store skips the browser's HTTP cache: a copy cached from opening the PDF in a tab has no CORS headers
  // (S3 adds them only when asked by a site), and reusing it would make the save fail.
  try { res = await fetch(key(url), { mode: 'cors', cache: 'no-store' }); } catch { throw new SaveError('blocked'); }
  if (!res.ok) throw new SaveError(res.status === 403 || res.status === 404 ? 'missing' : 'failed');
  const blob = await res.blob();
  try {
    await cache.put(key(url), new Response(blob, { headers: { 'Content-Type': type || blob.type || 'application/octet-stream' } }));
  } catch (e) {
    throw new SaveError(e?.name === 'QuotaExceededError' ? 'full' : 'failed');
  }
}

// Saves the PDF and, if it has one, the audio. A missing audio file does not stop the PDF from being saved.
export async function saveDoc(doc) {
  const cache = await caches.open(FILES);
  await store(cache, doc.url, 'application/pdf');
  if (doc.audioUrl) await store(cache, doc.audioUrl).catch(() => {});
  // Asks the browser not to clear saved files when space runs low (it may decline, which is fine).
  navigator.storage?.persist?.().catch(() => {});
}

export async function removeDoc(doc) {
  const cache = await caches.open(FILES);
  await cache.delete(key(doc.url));
  if (doc.audioUrl) await cache.delete(key(doc.audioUrl));
}

export async function removeAll() {
  await caches.delete(FILES);
}

// The saved copy of a link as a Blob, or null if it is not saved.
export async function savedFile(url) {
  if (!url || !canSave()) return null;
  const res = await (await caches.open(FILES)).match(key(url));
  return res ? res.blob() : null;
}

// Bytes this site stores on the device, including the app itself; null if the browser does not say.
export async function bytesUsed() {
  try { return (await navigator.storage.estimate()).usage ?? null; } catch { return null; }
}

// Keeps a copy of the current page for the service worker, so this collection's list opens offline too.
export function keepPageOffline() {
  fetch(location.href, { headers: { Accept: 'text/html' } }).catch(() => {});
}
