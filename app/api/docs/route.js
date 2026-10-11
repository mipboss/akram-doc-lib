import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { isAdmin } from '@/lib/auth';
import { readCatalog, writeCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET() { return NextResponse.json(await readCatalog()); }

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Administrators only' }, { status: 401 });
  const { title, category, tags, url, size } = await req.json();
  if (!title?.trim() || !url) return NextResponse.json({ error: 'Title and file are required' }, { status: 400 });
  const doc = {
    id: crypto.randomUUID(),
    title: title.trim(),
    category: (category || 'General').trim() || 'General',
    tags: (tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    url, size: size || 0, added: new Date().toISOString(),
  };
  const docs = await readCatalog();
  await writeCatalog([doc, ...docs]);
  return NextResponse.json(doc);
}

export async function DELETE(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Administrators only' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const docs = await readCatalog();
  const doc = docs.find((d) => d.id === id);
  if (doc) { await del(doc.url); await writeCatalog(docs.filter((d) => d.id !== id)); }
  return NextResponse.json({ ok: true });
}
