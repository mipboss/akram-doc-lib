'use client';
import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { docOrder, label } from '@/lib/shared';

const toVercel = (file, folder) =>
  upload(`${folder}/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/upload', multipart: file.size > 50 * 1024 * 1024 });

// The server signs an upload form; the browser then posts the file straight to the bucket.
async function toS3(file, folder) {
  const r = await fetch('/api/upload/s3', { method: 'POST', body: JSON.stringify({ folder, name: file.name, type: file.type }) });
  const j = await r.json().catch(() => ({ error: 'Server error' }));
  if (!r.ok) throw new Error(j.error);
  const form = new FormData();
  Object.entries(j.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file);
  const up = await fetch(j.url, { method: 'POST', body: form }).catch(() => null);
  if (!up?.ok) throw new Error(`S3 did not accept the file${up ? ` (${up.status})` : ''}. Check the bucket's CORS settings and the access key's permissions.`);
  return { url: j.fileUrl };
}

const send = (store, file, folder) => (store.to === 's3' ? toS3 : toVercel)(file, folder);

// Where new uploads go. S3 is offered only when the server has S3 settings; the choice is remembered on this device.
function useStore(signedIn) {
  const [s3, setS3] = useState(null);
  const [to, setToState] = useState('vercel');
  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/upload/s3').then((r) => r.json()).then((j) => {
      setS3(j.enabled ? j.bucket : null);
      let saved = null;
      try { saved = localStorage.getItem('uploadTo'); } catch {}
      if (j.enabled) setToState(saved || 's3');
    }).catch(() => {});
  }, [signedIn]);
  const setTo = (v) => { setToState(v); try { localStorage.setItem('uploadTo', v); } catch {} };
  return { s3, to: s3 ? to : 'vercel', setTo };
}

function StorePicker({ store }) {
  if (!store.s3) return <p className="hint">Uploads go to Vercel Blob. To upload to AWS S3, add the S3 settings in Vercel (see the README).</p>;
  return (
    <fieldset className="checks"><legend>Upload files to</legend>
      <label className="check"><input type="radio" name="store" checked={store.to === 's3'} onChange={() => store.setTo('s3')} /> AWS S3 ({store.s3})</label>
      <label className="check"><input type="radio" name="store" checked={store.to === 'vercel'} onChange={() => store.setTo('vercel')} /> Vercel Blob</label>
    </fieldset>
  );
}

const Field = ({ label: text, hint, ...props }) => (
  <label className="field">{text}<input type="text" {...props} />{hint && <span className="hint">{hint}</span>}</label>
);

function CollectionForm({ coll, count, call, select }) {
  const [f, setF] = useState({ en: coll?.name.en || '', gu: coll?.name.gu || '', path: coll?.path || '', sort: coll?.sort || 'key' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    const cat = await call('collection.save', { id: coll?.id, path: f.path, name: { en: f.en, gu: f.gu }, sort: f.sort });
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
      <label className="field">Order documents by
        <select value={f.sort} onChange={set('sort')}>
          <option value="key">Sort key</option>
          <option value="name">Name (Gujarati or English, as shown to the reader)</option>
        </select>
      </label>
      <div className="row">
        <button className="btn">{coll ? 'Save collection' : 'Create collection'}</button>
        {coll && <button type="button" className="btn alt" onClick={remove}>Delete collection</button>}
      </div>
    </form>
  );
}

// Collections appear to readers in this order; the first one is also the home page.
function Order({ collections, call }) {
  if (collections.length < 2) return null;
  const last = collections.length - 1;
  return (
    <details className="panel order">
      <summary>Order of collections</summary>
      <p className="hint">Readers see the collections in this order. The first one opens on the home page.</p>
      <ol>
        {collections.map((c, i) => (
          <li key={c.id}>
            <span>{label(c.name, 'en')}</span>
            <button type="button" className="mini" disabled={i === 0} onClick={() => call('collection.move', { id: c.id, by: -1 })} aria-label={`Move ${label(c.name, 'en')} up`}>↑</button>
            <button type="button" className="mini" disabled={i === last} onClick={() => call('collection.move', { id: c.id, by: 1 })} aria-label={`Move ${label(c.name, 'en')} down`}>↓</button>
          </li>
        ))}
      </ol>
    </details>
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

// The file name from a file or a link, without its extension: "Aptvani-01.pdf" -> "Aptvani-01".
const fileName = (s) => decodeURIComponent(String(s).split(/[?#]/)[0].split('/').pop()).replace(/\.[^.]+$/, '');

// A file's location: a link to paste or edit, or a file to upload in its place.
function Source({ label: text, accept, link, setLink, file, setFile }) {
  return (
    <div className="source">
      <label className="field">{text}
        <input type="text" inputMode="url" value={file ? '' : link} onChange={(e) => setLink(e.target.value)} disabled={!!file}
          placeholder={file ? `${file.name} uploads when you save` : 'https://…'} />
      </label>
      {link && !file && <a className="hint" href={link} target="_blank" rel="noreferrer">Open this link</a>}
      <label className="hint">or upload a file
        <input type="file" accept={accept} onChange={(e) => setFile(e.target.files[0] || null)} />
      </label>
    </div>
  );
}

function DocForm({ coll, doc, call, done, store }) {
  const [f, setF] = useState({
    en: doc?.name.en || '', gu: doc?.name.gu || '', sortKey: doc?.sortKey || '', tags: doc?.tags || [],
    url: doc?.url || '', audioUrl: doc?.audioUrl || '',
  });
  const [pdf, setPdf] = useState(null);
  const [audio, setAudio] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setTo = (k) => (v) => setF({ ...f, [k]: v });
  const toggle = (id) => setF({ ...f, tags: f.tags.includes(id) ? f.tags.filter((t) => t !== id) : [...f.tags, id] });

  async function save(e) {
    e.preventDefault();
    if (!pdf && !f.url.trim()) return setErr('Paste a PDF link or choose a PDF file.');
    setBusy(true); setErr(pdf || audio ? 'Uploading…' : '');
    try {
      const url = pdf ? (await send(store, pdf, `docs/${coll.path}`)).url : f.url.trim();
      const audioUrl = audio ? (await send(store, audio, `audio/${coll.path}`)).url : f.audioUrl.trim() || null;
      const en = f.en.trim() || f.gu.trim() ? f.en : fileName(pdf ? pdf.name : url);
      setErr('');
      const ok = await call('doc.save', {
        id: doc?.id, collectionId: coll.id, name: { en, gu: f.gu }, sortKey: f.sortKey, tags: f.tags,
        url, audioUrl, size: pdf ? pdf.size : url === doc?.url ? doc.size : 0,
      });
      if (ok) return done();
    } catch (e) { setErr('Upload failed: ' + e.message); }
    setBusy(false);
  }

  return (
    <form className="panel" onSubmit={save}>
      <Source label="PDF link" accept="application/pdf" link={f.url} setLink={setTo('url')} file={pdf} setFile={setPdf} />
      <Source label="Audio link (optional)" accept="audio/*" link={f.audioUrl} setLink={setTo('audioUrl')} file={audio} setFile={setAudio} />
      {(pdf || audio) && <StorePicker store={store} />}
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

function DocRow({ doc, coll, call, store }) {
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
        ? <DocForm coll={coll} doc={doc} call={call} done={() => setEditing(false)} store={store} />
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
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const store = useStore(admin);

  const load = () => fetch('/api/catalog').then((r) => r.json()).then((c) => { setCatalog(c); setSel(c.collections[0]?.id || 'new'); });
  useEffect(() => { fetch('/api/login').then((r) => r.json()).then((j) => { setAdmin(j.admin); if (j.admin) load(); }); }, []);
  useEffect(() => { if (msg === 'Saved.') { const t = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(t); } }, [msg]);

  // Runs one catalog change on the server and returns the updated catalog, or null if it failed.
  // Changes run one at a time: each starts from the catalog the previous one saved, so none is lost.
  async function call(op, args) {
    if (saving.current) return null;
    saving.current = true; setBusy(true); setMsg('Saving…');
    try {
      const r = await fetch('/api/catalog', { method: 'POST', body: JSON.stringify({ op, ...args }) });
      const j = await r.json().catch(() => ({ error: 'Server error. Try again.' }));
      if (!r.ok) { setMsg(j.error); return null; }
      setCatalog(j); setMsg('Saved.');
      return j;
    } catch {
      setMsg('Could not reach the server. Check your connection and try again.');
      return null;
    } finally {
      saving.current = false; setBusy(false);
    }
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
  const docs = coll ? catalog.docs.filter((d) => d.collectionId === coll.id).sort(docOrder(coll, 'en')) : [];
  return (
    <main>
      <div className="top"><h1>Manage library</h1><a href={coll ? `/${coll.path}` : '/'}>Library</a></div>
      <fieldset className="plain" disabled={busy}>
        <label className="field">Collection
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            {catalog.collections.map((c) => <option key={c.id} value={c.id}>{label(c.name, 'en')}</option>)}
            <option value="new">+ New collection</option>
          </select>
        </label>
        <Order collections={catalog.collections} call={call} />
        <CollectionForm key={sel} coll={coll} count={docs.length} call={call} select={setSel} />

        {coll && (
          <>
            <h2>Tags</h2>
            {coll.tags.map((t) => <TagRow key={t.id} coll={coll} tag={t} call={call} />)}
            <TagRow key={`new-${coll.id}-${coll.tags.length}`} coll={coll} call={call} />

            <h2>Add a document</h2>
            <DocForm key={`new-${coll.id}-${added}`} coll={coll} call={call} done={() => setAdded(added + 1)} store={store} />

            <h2>Documents ({docs.length})</h2>
            {docs.map((d) => <DocRow key={d.id} doc={d} coll={coll} call={call} store={store} />)}
          </>
        )}
        <Import call={call} say={setMsg} select={setSel} />
      </fieldset>
      <p><button className="btn alt" onClick={async () => { await fetch('/api/login', { method: 'DELETE' }); setAdmin(false); }}>Sign out</button></p>
      {msg && <p className="toast" role="status">{msg}</p>}
    </main>
  );
}
