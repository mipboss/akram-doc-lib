import { put, list, del } from '@vercel/blob';
import { isBlobUrl } from './shared';

// Every save writes a new file, catalog/<time>.json, and reads take the newest one. Overwriting a single file
// does not work: the storage CDN can serve the old copy for up to a minute, so quick edits read stale data
// and undo each other. The newest few versions are kept as backups.
const DIR = 'catalog/';
const KEEP = 10;
// Where catalogs were saved before versioning; read only until the first save.
const LEGACY = 'catalog.json';
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

const versions = async () => (await list({ prefix: DIR })).blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));

export async function readCatalog() {
  const latest = (await versions()).at(-1) || (await list({ prefix: LEGACY, limit: 1 })).blobs[0];
  if (!latest) return { collections: [], docs: [] };
  const res = await fetch(latest.url, { cache: 'no-store' });
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
  // Zero-padded so the names sort in time order.
  await put(`${DIR}${String(Date.now()).padStart(15, '0')}.json`, JSON.stringify(catalog), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  });
  const old = [...(await versions()).slice(0, -KEEP), ...(await list({ prefix: LEGACY })).blobs];
  if (old.length) await del(old.map((b) => b.url));
}

// Removes uploaded files; links to files hosted elsewhere are left alone.
export async function deleteFiles(urls) {
  const ours = urls.filter(isBlobUrl);
  if (ours.length) await del(ours);
}
