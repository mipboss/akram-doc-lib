'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { byKey, isBlobUrl, label, size } from '@/lib/shared';

const UI = {
  en: { search: 'Search this collection', open: 'Open', download: 'Download', listen: 'Listen', other: 'ગુજરાતી', empty: 'No documents match. Clear the search or filters.', none: 'No documents in this collection yet.' },
  gu: { search: 'આ સંગ્રહમાં શોધો', open: 'ખોલો', download: 'ડાઉનલોડ', listen: 'સાંભળો', other: 'English', empty: 'કોઈ દસ્તાવેજ મળ્યો નથી. શોધ અથવા ફિલ્ટર સાફ કરો.', none: 'આ સંગ્રહમાં હજી કોઈ દસ્તાવેજ નથી.' },
};

function ThemeButton() {
  const flip = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  };
  return <button className="icon" onClick={flip} aria-label="Switch between light and dark mode" title="Light / dark">◐</button>;
}

function Player({ doc, lang, onClose }) {
  return (
    <div className="player" role="region" aria-label="Audio player">
      <div className="title">{label(doc.name, lang)}</div>
      <audio key={doc.id} src={doc.audioUrl} controls autoPlay />
      <button className="icon" onClick={onClose} aria-label="Close audio player">✕</button>
    </div>
  );
}

export default function Library({ catalog, path, lang: initialLang }) {
  const [lang, setLang] = useState(initialLang);
  const [q, setQ] = useState('');
  const [active, setActive] = useState([]);
  const [playing, setPlaying] = useState(null);
  const t = UI[lang];

  const switchLang = () => {
    const next = lang === 'gu' ? 'en' : 'gu';
    setLang(next);
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
  };

  const coll = catalog?.collections.find((c) => c.path === path) || catalog?.collections[0];
  const docs = useMemo(() => (catalog?.docs || []).filter((d) => d.collectionId === coll?.id).sort(byKey), [catalog, coll]);
  const tagName = (id) => coll.tags.find((x) => x.id === id)?.name;
  const tags = coll?.tags.filter((tag) => docs.some((d) => d.tags.includes(tag.id))) || [];
  const on = active.filter((id) => tags.some((tag) => tag.id === id));
  const words = q.trim().toLowerCase();
  const shown = docs.filter((d) =>
    (!on.length || d.tags.some((id) => on.includes(id))) &&
    (!words || [d.name.en, d.name.gu, d.sortKey, ...d.tags.flatMap((id) => [tagName(id)?.en, tagName(id)?.gu])]
      .join(' ').toLowerCase().includes(words)));
  const toggle = (id) => setActive(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);

  return (
    <main lang={lang} className={playing ? 'with-player' : ''}>
      <div className="top">
        <h1>{coll ? label(coll.name, lang) : 'PDF Library'}</h1>
        <div className="row tools">
          <button className="icon" onClick={switchLang} lang={lang === 'gu' ? 'en' : 'gu'}>{t.other}</button>
          <ThemeButton />
          <a href="/admin">Admin</a>
        </div>
      </div>

      {!catalog && <p className="empty">The library is unavailable right now. Try again in a minute.</p>}
      {catalog && !coll && <p className="empty">No collections yet. An administrator can add the first one.</p>}

      {coll && (
        <>
          {catalog.collections.length > 1 && (
            <nav className="scroll" aria-label="Collections">
              {catalog.collections.map((c) => (
                <Link key={c.id} className="chip" href={`/${c.path}`} aria-current={c.id === coll.id ? 'page' : undefined}>{label(c.name, lang)}</Link>
              ))}
            </nav>
          )}
          <input type="search" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
          {tags.length > 0 && (
            <div className="row" role="group" aria-label="Tags">
              {tags.map((tag) => (
                <button key={tag.id} className="tag" aria-pressed={on.includes(tag.id)} onClick={() => toggle(tag.id)}>#{label(tag.name, lang)}</button>
              ))}
            </div>
          )}
          {shown.length === 0 && <p className="empty">{docs.length ? t.empty : t.none}</p>}
          {shown.map((d) => (
            <article className="doc" key={d.id}>
              <h3>{label(d.name, lang)}</h3>
              <div className="meta">
                {[d.size ? size(d.size) : '', d.added ? new Date(d.added).toLocaleDateString(lang === 'gu' ? 'gu-IN' : undefined) : '',
                  ...d.tags.map((id) => '#' + label(tagName(id), lang)).filter((x) => x !== '#')].filter(Boolean).join(' · ')}
              </div>
              <div className="row" style={{ margin: 0 }}>
                <a className="btn" href={d.url} target="_blank" rel="noreferrer">{t.open}</a>
                <a className="btn alt" href={isBlobUrl(d.url) ? `${d.url}?download=1` : d.url} download>{t.download}</a>
                {d.audioUrl && <button className="btn alt" onClick={() => setPlaying(d)}>▶ {t.listen}</button>}
              </div>
            </article>
          ))}
        </>
      )}
      {playing && <Player doc={playing} lang={lang} onClose={() => setPlaying(null)} />}
    </main>
  );
}
