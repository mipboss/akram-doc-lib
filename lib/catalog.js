import { put, list, del } from '@vercel/blob';
import { isBlobUrl } from './shared';

const KEY = 'catalog.json';
// Collection web addresses that would clash with the app's own pages.
export const RESERVED = ['admin', 'api'];

// Catalog shape:
// { collections: [{ id, path, name: { en, gu }, tags: [{ id, name: { en, gu } }] }],
//   docs: [{ id, collectionId, name: { en, gu }, sortKey, tags: [tagId], url, audioUrl, size, added }] }

export const slug = (s) =>
  String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// The first version stored a flat array of { title, category, tags: [string] }; each category becomes a collection.
// IDs are derived from position, not random, so every read gives the same IDs until the new shape is first saved.
function migrate(old) {
  const collections = [];
  const docs = old.map((d) => {
    const cat = d.category || 'General';
    let c = collections.find((x) => x.name.en === cat);
    if (!c) {
      let path = slug(cat) || 'general';
      while (RESERVED.includes(path) || collections.some((x) => x.path === path)) path += '_2';
      collections.push(c = { id: `c${collections.length + 1}`, path, name: { en: cat, gu: '' }, tags: [] });
    }
    const tags = (d.tags || []).map((t) => {
      let tag = c.tags.find((x) => x.name.en === t);
      if (!tag) c.tags.push(tag = { id: `${c.id}t${c.tags.length + 1}`, name: { en: t, gu: '' } });
      return tag.id;
    });
    return { id: d.id, collectionId: c.id, name: { en: d.title, gu: '' }, sortKey: '', tags, url: d.url, audioUrl: null, size: d.size || 0, added: d.added };
  });
  return { collections, docs };
}

export async function readCatalog() {
  const { blobs } = await list({ prefix: KEY, limit: 1 });
  if (!blobs.length) return { collections: [], docs: [] };
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
  // Throw rather than return an empty catalog, so a failed read can never be saved over the real one.
  if (!res.ok) throw new Error('Could not read the catalog');
  const data = await res.json();
  return Array.isArray(data) ? migrate(data) : data;
}

// What a library page needs: every collection, but only the documents of the one being shown.
export function pageData(catalog, path) {
  const coll = catalog.collections.find((c) => c.path === path) || catalog.collections[0];
  return { collections: catalog.collections, docs: catalog.docs.filter((d) => d.collectionId === coll?.id) };
}

export async function writeCatalog(catalog) {
  await put(KEY, JSON.stringify(catalog), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0,
  });
}

// Removes uploaded files; links to files hosted elsewhere are left alone.
export async function deleteFiles(urls) {
  const ours = urls.filter(isBlobUrl);
  if (ours.length) await del(ours);
}
