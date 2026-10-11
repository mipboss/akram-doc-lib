'use client';
import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function Admin() {
  const [admin, setAdmin] = useState(null);
  const [pw, setPw] = useState('');
  const [docs, setDocs] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useRef(null);

  const load = () => fetch('/api/docs').then((r) => r.json()).then(setDocs);
  useEffect(() => { fetch('/api/login').then((r) => r.json()).then((j) => { setAdmin(j.admin); if (j.admin) load(); }); }, []);

  async function login(e) {
    e.preventDefault();
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    if (r.ok) { setAdmin(true); setMsg(''); load(); } else setMsg('Wrong password. Try again.');
  }

  async function add(e) {
    e.preventDefault();
    const f = new FormData(form.current);
    const file = f.get('file');
    if (!file?.size) return setMsg('Choose a PDF file.');
    setBusy(true); setMsg('Uploading…');
    try {
      const blob = await upload(`docs/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/upload' });
      const r = await fetch('/api/docs', { method: 'POST', body: JSON.stringify({
        title: f.get('title') || file.name.replace(/\.pdf$/i, ''),
        category: f.get('category'), tags: String(f.get('tags')).split(','), url: blob.url, size: file.size }) });
      if (!r.ok) throw new Error((await r.json()).error);
      form.current.reset(); setMsg('Document added.'); load();
    } catch (err) { setMsg('Upload failed: ' + err.message); }
    setBusy(false);
  }

  async function remove(d) {
    if (!confirm(`Delete "${d.title}"?`)) return;
    await fetch(`/api/docs?id=${d.id}`, { method: 'DELETE' }); load();
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

  const cats = [...new Set(docs.map((d) => d.category))];
  return (
    <main>
      <div className="top"><h1>Add a document</h1><a href="/">Library</a></div>
      <form ref={form} onSubmit={add}>
        <label htmlFor="file">PDF file</label>
        <input id="file" name="file" type="file" accept="application/pdf" />
        <label htmlFor="title">Name (optional, defaults to file name)</label>
        <input id="title" name="title" type="text" />
        <label htmlFor="category">Category</label>
        <input id="category" name="category" type="text" list="cats" placeholder="e.g. Policies" />
        <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        <label htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" type="text" placeholder="hr, 2026, forms" />
        <p role="status">{msg}</p>
        <button className="btn" disabled={busy}>Upload document</button>
      </form>
      <h2>Documents ({docs.length})</h2>
      {docs.map((d) => (
        <div className="doc" key={d.id}>
          <h3>{d.title}</h3>
          <div className="meta">{d.category}{d.tags.length ? ' · ' + d.tags.map((t) => '#' + t).join(' ') : ''}</div>
          <button className="btn alt" onClick={() => remove(d)}>Delete</button>
        </div>
      ))}
      <p><button className="btn alt" onClick={async () => { await fetch('/api/login', { method: 'DELETE' }); setAdmin(false); }}>Sign out</button></p>
    </main>
  );
}
