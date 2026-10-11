import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { readCatalog, writeCatalog, deleteFiles, slug, RESERVED } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

class Invalid extends Error {}
const need = (ok, msg) => { if (!ok) throw new Invalid(msg); };
const text = (s) => String(s ?? '').trim();
const names = (n, what) => {
  const name = { en: text(n?.en), gu: text(n?.gu) };
  need(name.en || name.gu, `Give the ${what} an English or Gujarati name`);
  return name;
};
const link = (u) => (u ? (need(/^https?:\/\//.test(u), 'Files must be web links'), u) : null);
const find = (list, id, what) => {
  const item = list.find((x) => x.id === id);
  need(item, `${what} not found. Reload the page.`);
  return item;
};

// Each operation edits the catalog in place and returns the file URLs that are no longer used.
const ops = {
  'collection.save'(cat, { id, path, name }) {
    const n = names(name, 'collection');
    const p = slug(path) || slug(n.en) || 'collection_' + (cat.collections.length + 1);
    need(!RESERVED.includes(p), `"${p}" is reserved. Choose another web address.`);
    need(!cat.collections.some((c) => c.path === p && c.id !== id), `Another collection already uses "${p}".`);
    if (id) Object.assign(find(cat.collections, id, 'Collection'), { path: p, name: n });
    else cat.collections.push({ id: crypto.randomUUID(), path: p, name: n, tags: [] });
    return [];
  },
  'collection.delete'(cat, { id }) {
    find(cat.collections, id, 'Collection');
    const gone = cat.docs.filter((d) => d.collectionId === id);
    cat.collections = cat.collections.filter((c) => c.id !== id);
    cat.docs = cat.docs.filter((d) => d.collectionId !== id);
    return gone.flatMap((d) => [d.url, d.audioUrl]);
  },
  'tag.save'(cat, { collectionId, id, name }) {
    const c = find(cat.collections, collectionId, 'Collection');
    const n = names(name, 'tag');
    if (id) find(c.tags, id, 'Tag').name = n;
    else c.tags.push({ id: crypto.randomUUID(), name: n });
    return [];
  },
  'tag.delete'(cat, { collectionId, id }) {
    const c = find(cat.collections, collectionId, 'Collection');
    c.tags = c.tags.filter((t) => t.id !== id);
    for (const d of cat.docs) d.tags = d.tags.filter((t) => t !== id);
    return [];
  },
  'doc.save'(cat, { id, collectionId, name, sortKey, tags, url, audioUrl, size }) {
    const c = find(cat.collections, collectionId, 'Collection');
    need(url, 'Choose a PDF file');
    const fields = {
      collectionId, name: names(name, 'document'), sortKey: text(sortKey),
      tags: (tags || []).filter((t) => c.tags.some((x) => x.id === t)),
      url: link(url), audioUrl: link(audioUrl), size: Number(size) || 0,
    };
    if (!id) {
      cat.docs.push({ id: crypto.randomUUID(), ...fields, added: new Date().toISOString() });
      return [];
    }
    const d = find(cat.docs, id, 'Document');
    const unused = [d.url, d.audioUrl].filter((u) => u && u !== fields.url && u !== fields.audioUrl);
    Object.assign(d, fields);
    return unused;
  },
  'doc.delete'(cat, { id }) {
    const d = find(cat.docs, id, 'Document');
    cat.docs = cat.docs.filter((x) => x.id !== id);
    return [d.url, d.audioUrl];
  },
};

export async function GET() { return NextResponse.json(await readCatalog()); }

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Administrators only' }, { status: 401 });
  const { op, ...args } = await req.json();
  if (!ops[op]) return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
  try {
    const cat = await readCatalog();
    const unused = ops[op](cat, args);
    await writeCatalog(cat);
    await deleteFiles(unused.filter(Boolean));
    return NextResponse.json(cat);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e instanceof Invalid ? 400 : 500 });
  }
}
