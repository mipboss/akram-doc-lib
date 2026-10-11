'use client';
import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { byKey, label } from '@/lib/shared';

const send = (file, folder) =>
  upload(`${folder}/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/upload', multipart: file.size > 50 * 1024 * 1024 });

const Field = ({ label: text, hint, ...props }) => (
  <label className="field">{text}<input type="text" {...props} />{hint && <span className="hint">{hint}</span>}</label>
);

function CollectionForm({ coll, count, call, select }) {
  const [f, setF] = useState({ en: coll?.name.en || '', gu: coll?.name.gu || '', path: coll?.path || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    const cat = await call('collection.save', { id: coll?.id, path: f.path, name: { en: f.en, gu: f.gu } });
    if (cat && !coll) select(cat.collections.at(-1).id);
  }
  async function remove() {
    if (!confirm(`Delete the collection "${label(coll.name, 'en')}" and its ${count} documents? This cannot be undone.`)) return;
    const cat = await call('collection.delete', { id: coll.id });
    if (cat) select(cat.collections[0]?.id || 'new');
  }

  return (
    <form className="panel" onSubmit={save}>
      <div className="pair">
        <Field label="English name" value={f.en} onChange={set('en')} />
        <Field label="Gujarati name" lang="gu" value={f.gu} onChange={set('gu')} />
      </div>
      <Field label="Web address" value={f.path} onChange={set('path')} placeholder="made from the English name"
        hint={coll ? `Library page: /${coll.path}` : 'Letters, numbers and underscores, e.g. pads_by_cd'} />
      <div className="row">
        <button className="btn">{coll ? 'Save collection' : 'Create collection'}</button>
        {coll && <button type="button" className="btn alt" onClick={remove}>Delete collection</button>}
      </div>
    </form>
  );
}

function TagRow({ coll, tag, call }) {
  const [en, setEn] = useState(tag?.name.en || '');
  const [gu, setGu] = useState(tag?.name.gu || '');
  const save = (e) => { e.preventDefault(); call('tag.save', { collectionId: coll.id, id: tag?.id, name: { en, gu } }); };
  const remove = () => confirm(`Delete the tag "${label(tag.name, 'en')}"? Documents keep everything else.`) &&
    call('tag.delete', { collectionId: coll.id, id: tag.id });
  return (
    <form className="tagrow" onSubmit={save}>
      <input type="text" aria-label="Tag in English" placeholder="English" value={en} onChange={(e) => setEn(e.target.value)} />
      <input type="text" aria-label="Tag in Gujarati" placeholder="ગુજરાતી" lang="gu" value={gu} onChange={(e) => setGu(e.target.value)} />
      <button className="btn alt">{tag ? 'Save' : 'Add tag'}</button>
      {tag && <button type="button" className="btn alt" onClick={remove}>Delete</button>}
    </form>
  );
}

function DocForm({ coll, doc, call, done }) {
  const [f, setF] = useState({ en: doc?.name.en || '', gu: doc?.name.gu || '', sortKey: doc?.sortKey || '', tags: doc?.tags || [], dropAudio: false });
  const [pdf, setPdf] = useState(null);
  const [audio, setAudio] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (id) => setF({ ...f, tags: f.tags.includes(id) ? f.tags.filter((t) => t !== id) : [...f.tags, id] });

  async function save(e) {
    e.preventDefault();
    if (!doc && !pdf) return setErr('Choose a PDF file.');
    setBusy(true); setErr('Uploading…');
    try {
      const url = pdf ? (await send(pdf, `docs/${coll.path}`)).url : doc.url;
      const audioUrl = audio ? (await send(audio, `audio/${coll.path}`)).url : f.dropAudio ? null : doc?.audioUrl || null;
      const en = f.en.trim() || f.gu.trim() || !pdf ? f.en : pdf.name.replace(/\.pdf$/i, '');
      setErr('');
      const ok = await call('doc.save', {
        id: doc?.id, collectionId: coll.id, name: { en, gu: f.gu }, sortKey: f.sortKey, tags: f.tags,
        url, audioUrl, size: pdf ? pdf.size : doc.size,
      });
      if (ok) return done();
    } catch (e) { setErr('Upload failed: ' + e.message); }
    setBusy(false);
  }

  return (
    <form className="panel" onSubmit={save}>
      <label className="field">{doc ? 'Replace PDF (optional)' : 'PDF file'}
        <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files[0] || null)} />
      </label>
      <label className="field">{doc?.audioUrl ? 'Replace audio (optional)' : 'Audio (optional)'}
        <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files[0] || null)} />
      </label>
      {doc?.audioUrl && !audio && (
        <label className="check"><input type="checkbox" checked={f.dropAudio} onChange={(e) => setF({ ...f, dropAudio: e.target.checked })} /> Remove the current audio</label>
      )}
      <div className="pair">
        <Field label="English name" value={f.en} onChange={set('en')} placeholder={doc ? '' : 'defaults to the file name'} />
        <Field label="Gujarati name" lang="gu" value={f.gu} onChange={set('gu')} />
      </div>
      <Field label="Sort key" value={f.sortKey} onChange={set('sortKey')} hint="Controls the order, e.g. 001, 002. Leave empty to sort by name." />
      {coll.tags.length > 0 && (
        <fieldset className="checks"><legend>Tags</legend>
          {coll.tags.map((t) => (
            <label className="check" key={t.id}><input type="checkbox" checked={f.tags.includes(t.id)} onChange={() => toggle(t.id)} /> {label(t.name, 'en')}</label>
          ))}
        </fieldset>
      )}
      {err && <p className="err" role="status">{err}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{doc ? 'Save document' : 'Add document'}</button>
        {doc && <button type="button" className="btn alt" onClick={done} disabled={busy}>Cancel</button>}
      </div>
    </form>
  );
}

function DocRow({ doc, coll, call }) {
  const [editing, setEditing] = useState(false);
  const tags = doc.tags.map((id) => coll.tags.find((t) => t.id === id)).filter(Boolean);
  const remove = () => confirm(`Delete "${label(doc.name, 'en')}"? Its PDF and audio files are deleted too.`) && call('doc.delete', { id: doc.id });
  return (
    <div className="doc">
      <h3>{label(doc.name, 'en')}{doc.name.en && doc.name.gu && <span className="meta" lang="gu"> · {doc.name.gu}</span>}</h3>
      <div className="meta">
        {[doc.sortKey && `Sort ${doc.sortKey}`, doc.audioUrl && '♪ Audio', ...tags.map((t) => '#' + label(t.name, 'en'))].filter(Boolean).join(' · ')}
      </div>
      {editing
        ? <DocForm coll={coll} doc={doc} call={call} done={() => setEditing(false)} />
        : <div className="row" style={{ margin: 0 }}>
            <button className="btn alt" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn alt" onClick={remove}>Delete</button>
            <a className="btn alt" href={doc.url} target="_blank" rel="noreferrer">Open</a>
          </div>}
    </div>
  );
}

function Import({ call, say, select }) {
  async function pick(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { return say('That file is not a valid catalog (JSON) file.'); }
    if (!confirm(`Add ${data.collections?.length ?? 0} collections and ${data.docs?.length ?? 0} documents to the library?`)) return;
    const cat = await call('catalog.import', data);
    if (cat && data.collections.length) select(cat.collections[cat.collections.length - data.collections.length].id);
  }
  return (
    <>
      <h2>Import and backup</h2>
      <label className="field">Import a catalog file (.json)
        <input type="file" accept="application/json,.json" onChange={pick} />
        <span className="hint">Adds the collections in the file. Collections already in the library are not changed.</span>
      </label>
      <p><a href="/api/catalog" download="catalog.json">Download a backup of the catalog</a></p>
    </>
  );
}

export default function Admin() {
  const [admin, setAdmin] = useState(null);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [sel, setSel] = useState(null);
  const [added, setAdded] = useState(0);

  const load = () => fetch('/api/catalog').then((r) => r.json()).then((c) => { setCatalog(c); setSel(c.collections[0]?.id || 'new'); });
  useEffect(() => { fetch('/api/login').then((r) => r.json()).then((j) => { setAdmin(j.admin); if (j.admin) load(); }); }, []);
  useEffect(() => { if (msg === 'Saved.') { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t); } }, [msg]);

  // Runs one catalog change on the server and returns the updated catalog, or null if it failed.
  async function call(op, args) {
    setMsg('Saving…');
    const r = await fetch('/api/catalog', { method: 'POST', body: JSON.stringify({ op, ...args }) });
    const j = await r.json().catch(() => ({ error: 'Server error. Try again.' }));
    if (!r.ok) { setMsg(j.error); return null; }
    setCatalog(j); setMsg('Saved.');
    return j;
  }

  async function login(e) {
    e.preventDefault();
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    if (r.ok) { setAdmin(true); setMsg(''); load(); } else setMsg('Wrong password. Try again.');
  }

  if (admin === null) return <main><p className="empty">Loading…</p></main>;

  if (!admin) return (
    <main>
      <h1>Administrator sign-in</h1>
      <form onSubmit={login}>
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <p className="err">{msg}</p>
        <button className="btn">Sign in</button> <a href="/">Back to library</a>
      </form>
    </main>
  );

  if (!catalog) return <main><p className="empty">Loading…</p></main>;

  const coll = catalog.collections.find((c) => c.id === sel);
  const docs = coll ? catalog.docs.filter((d) => d.collectionId === coll.id).sort(byKey) : [];
  return (
    <main>
      <div className="top"><h1>Manage library</h1><a href={coll ? `/${coll.path}` : '/'}>Library</a></div>
      <label className="field">Collection
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          {catalog.collections.map((c) => <option key={c.id} value={c.id}>{label(c.name, 'en')}</option>)}
          <option value="new">+ New collection</option>
        </select>
      </label>
      <CollectionForm key={sel} coll={coll} count={docs.length} call={call} select={setSel} />

      {coll && (
        <>
          <h2>Tags</h2>
          {coll.tags.map((t) => <TagRow key={t.id} coll={coll} tag={t} call={call} />)}
          <TagRow key={`new-${coll.id}-${coll.tags.length}`} coll={coll} call={call} />

          <h2>Add a document</h2>
          <DocForm key={`new-${coll.id}-${added}`} coll={coll} call={call} done={() => setAdded(added + 1)} />

          <h2>Documents ({docs.length})</h2>
          {docs.map((d) => <DocRow key={d.id} doc={d} coll={coll} call={call} />)}
        </>
      )}
      <Import call={call} say={setMsg} select={setSel} />
      <p><button className="btn alt" onClick={async () => { await fetch('/api/login', { method: 'DELETE' }); setAdmin(false); }}>Sign out</button></p>
      {msg && <p className="toast" role="status">{msg}</p>}
    </main>
  );
}
