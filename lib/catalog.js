import { put, list } from '@vercel/blob';
const KEY = 'catalog.json';

export async function readCatalog() {
  const { blobs } = await list({ prefix: KEY, limit: 1 });
  if (!blobs.length) return [];
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
  return res.ok ? res.json() : [];
}

export async function writeCatalog(docs) {
  await put(KEY, JSON.stringify(docs), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0,
  });
}
