'use client';
import { useEffect, useMemo, useState } from 'react';

const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

export default function Home() {
  const [docs, setDocs] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [tag, setTag] = useState('');

  useEffect(() => { fetch('/api/docs').then((r) => r.json()).then(setDocs).catch(() => setDocs([])); }, []);

  const cats = useMemo(() => ['All', ...[...new Set((docs || []).map((d) => d.category))].sort()], [docs]);
  const tags = useMemo(() => [...new Set((docs || []).flatMap((d) => d.tags))].sort(), [docs]);
  const shown = (docs || []).filter((d) =>
    (cat === 'All' || d.category === cat) &&
    (!tag || d.tags.includes(tag)) &&
    (!q || (d.title + ' ' + d.tags.join(' ')).toLowerCase().includes(q.toLowerCase())));

  return (
    <main>
      <div className="top"><h1>PDF Library</h1><a href="/admin">Admin</a></div>
      <input type="search" placeholder="Search by name or tag" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documents" />
      <div className="scroll" role="group" aria-label="Categories">
        {cats.map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {tags.length > 0 && (
        <div className="row" role="group" aria-label="Tags">
          {tags.map((t) => <button key={t} className="tag" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>)}
        </div>
      )}
      {docs === null && <p className="empty">Loading documents…</p>}
      {docs && shown.length === 0 && <p className="empty">{docs.length ? 'No documents match. Clear the search or filters.' : 'No documents yet. An administrator can add the first one.'}</p>}
      {shown.map((d) => (
        <article className="doc" key={d.id}>
          <h3>{d.title}</h3>
          <div className="meta">{d.category} · {size(d.size)} · {new Date(d.added).toLocaleDateString()}</div>
          <div className="row" style={{ margin: 0 }}>
            <a className="btn" href={d.url} target="_blank" rel="noreferrer">Open</a>
            <a className="btn alt" href={`${d.url}?download=1`}>Download</a>
          </div>
        </article>
      ))}
    </main>
  );
}
