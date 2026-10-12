'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { docOrder, isBlobUrl, label, size } from '@/lib/shared';
import { bytesUsed, canSave, isSaved, keepPageOffline, removeAll, removeDoc, saveDoc, savedFile, savedLinks } from '@/lib/offline';
import Viewer, { prepareViewer } from './viewer';

// Large collections render in pages of this many cards so phones stay responsive.
const PAGE = 100;

const icon = (d) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const PLAY = icon('M7 4v16l13-8z');
const DOWNLOAD = icon('M12 3v12m-5-5 5 5 5-5M5 21h14');
const SAVE = icon('M12 4v10m-4-4 4 4 4-4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3');
const SAVED = icon('M5 12.5l4.5 4.5L19 7.5');
const mb = (n) => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';

const UI = {
  en: {
    search: 'Search this collection', open: 'Open', download: 'Download', listen: 'Listen', more: (n) => `Show more (${n} left)`, other: 'ગુજરાતી',
    empty: 'No documents match. Clear the search or filters.', none: 'No documents in this collection yet.',
    save: 'Save offline', unsave: 'Saved offline. Tap to remove.', savedOnly: (n) => `✓ Saved (${n})`, saveAll: (n) => `Save all ${n}`,
    saving: (a, b) => `Saving ${a} of ${b}…`, stop: 'Stop', used: (s) => `${s} on this device`, removeAll: 'Remove all',
    confirmAll: (n) => `Save all ${n} documents in this collection on this device? Large collections can use a lot of space.`,
    confirmRemove: 'Remove every saved document from this device?', done: (a, b) => (b ? `Saved ${a}. ${b} could not be saved.` : `Saved ${a}.`),
    blocked: "This file's server does not allow saving yet.", missing: 'This file could not be found.', full: 'Not enough space on this device.',
    failed: 'Saving failed. Try again.', offline: 'Connect to the internet to save files.',
    close: 'Close', zoomIn: 'Zoom in', zoomOut: 'Zoom out', pages: (n) => `${n} pages`, cantShow: 'This file cannot be shown.',
  },
  gu: {
    search: 'આ સંગ્રહમાં શોધો', open: 'ખોલો', download: 'ડાઉનલોડ', listen: 'સાંભળો', more: (n) => `વધુ બતાવો (${n} બાકી)`, other: 'English',
    empty: 'કોઈ દસ્તાવેજ મળ્યો નથી. શોધ અથવા ફિલ્ટર સાફ કરો.', none: 'આ સંગ્રહમાં હજી કોઈ દસ્તાવેજ નથી.',
    save: 'ઑફલાઇન સાચવો', unsave: 'ઑફલાઇન સાચવેલું. દૂર કરવા ટૅપ કરો.', savedOnly: (n) => `✓ સાચવેલા (${n})`, saveAll: (n) => `બધા ${n} સાચવો`,
    saving: (a, b) => `${b} માંથી ${a} સચવાય છે…`, stop: 'રોકો', used: (s) => `આ ઉપકરણ પર ${s}`, removeAll: 'બધું દૂર કરો',
    confirmAll: (n) => `આ સંગ્રહના બધા ${n} દસ્તાવેજ આ ઉપકરણ પર સાચવવા છે? મોટા સંગ્રહ ઘણી જગ્યા લઈ શકે છે.`,
    confirmRemove: 'આ ઉપકરણ પરથી બધા સાચવેલા દસ્તાવેજ દૂર કરવા છે?', done: (a, b) => (b ? `${a} સાચવ્યા. ${b} સાચવી શકાયા નહીં.` : `${a} સાચવ્યા.`),
    blocked: 'આ ફાઇલનું સર્વર હજી સાચવવાની મંજૂરી આપતું નથી.', missing: 'આ ફાઇલ મળી નથી.', full: 'આ ઉપકરણમાં પૂરતી જગ્યા નથી.',
    failed: 'સાચવી શકાયું નહીં. ફરી પ્રયાસ કરો.', offline: 'ફાઇલો સાચવવા ઇન્ટરનેટથી જોડાઓ.',
    close: 'બંધ કરો', zoomIn: 'મોટું કરો', zoomOut: 'નાનું કરો', pages: (n) => `${n} પાનાં`, cantShow: 'આ ફાઇલ બતાવી શકાતી નથી.',
  },
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

function Player({ doc, src, lang, onClose }) {
  return (
    <div className="player" role="region" aria-label="Audio player">
      <div className="title">{label(doc.name, lang)}</div>
      <audio key={src} src={src} controls autoPlay />
      <button className="icon" onClick={onClose} aria-label="Close audio player">✕</button>
    </div>
  );
}

export default function Library({ catalog, path, lang: initialLang }) {
  const [lang, setLang] = useState(initialLang);
  const [q, setQ] = useState('');
  const [active, setActive] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [offline, setOffline] = useState(false); // whether this browser can save files; known only after loading
  const [saved, setSaved] = useState(new Set());
  const [working, setWorking] = useState(new Set()); // documents being saved right now
  const [onlySaved, setOnlySaved] = useState(false);
  const [bulk, setBulk] = useState(null); // { done, total } while "Save all" runs
  const stopBulk = useRef(false);
  const [used, setUsed] = useState(null);
  const [viewing, setViewing] = useState(null); // { title, blob }
  const [note, setNote] = useState('');
  const t = UI[lang];

  const switchLang = () => {
    const next = lang === 'gu' ? 'en' : 'gu';
    setLang(next);
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
  };

  const coll = catalog?.collections.find((c) => c.path === path) || catalog?.collections[0];
  const docs = useMemo(() => (catalog?.docs || []).filter((d) => d.collectionId === coll?.id).sort(docOrder(coll, lang)), [catalog, coll, lang]);
  const tagName = (id) => coll.tags.find((x) => x.id === id)?.name;
  const tags = coll?.tags.filter((tag) => docs.some((d) => d.tags.includes(tag.id))) || [];
  const on = active.filter((id) => tags.some((tag) => tag.id === id));
  const words = q.trim().toLowerCase();
  const shown = docs.filter((d) =>
    (!on.length || d.tags.some((id) => on.includes(id))) &&
    (!words || [d.name.en, d.name.gu, d.sortKey, ...d.tags.flatMap((id) => [tagName(id)?.en, tagName(id)?.gu])]
      .join(' ').toLowerCase().includes(words)));
  const toggle = (id) => setActive(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);

  const refresh = useCallback(async () => { setSaved(await savedLinks()); setUsed(await bytesUsed()); }, []);
  useEffect(() => { if (canSave()) { setOffline(true); refresh(); } }, [refresh]);
  useEffect(() => { if (!note) return; const id = setTimeout(() => setNote(''), 4000); return () => clearTimeout(id); }, [note]);
  const savedHere = docs.filter((d) => isSaved(saved, d));
  // Keep this collection's page for offline use whenever it has saved documents.
  useEffect(() => { if (savedHere.length && navigator.onLine) keepPageOffline(); }, [savedHere.length]);
  const visible = onlySaved && savedHere.length ? shown.filter((d) => isSaved(saved, d)) : shown;

  const busy = (id, on) => setWorking((w) => { const n = new Set(w); on ? n.add(id) : n.delete(id); return n; });

  async function toggleSave(d) {
    if (isSaved(saved, d)) { await removeDoc(d); return refresh(); }
    if (!navigator.onLine) return setNote(t.offline);
    busy(d.id, true);
    try {
      await saveDoc(d);
      prepareViewer();
    } catch (e) { setNote(t[e.message] || t.failed); }
    busy(d.id, false);
    refresh();
  }

  async function saveAll() {
    const todo = docs.filter((d) => !isSaved(saved, d));
    if (!navigator.onLine) return setNote(t.offline);
    if (!confirm(t.confirmAll(todo.length))) return;
    prepareViewer();
    stopBulk.current = false;
    let done = 0, failed = 0, next = 0;
    setBulk({ done, total: todo.length });
    // Three at a time: fast enough, without flooding a phone's connection.
    const worker = async () => {
      while (next < todo.length && !stopBulk.current) {
        const d = todo[next++];
        try { await saveDoc(d); } catch (e) { failed++; if (e.message === 'full') stopBulk.current = true; }
        setBulk({ done: ++done, total: todo.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBulk(null);
    setNote(t.done(done - failed, failed));
    refresh();
  }

  async function clearAll() {
    if (!confirm(t.confirmRemove)) return;
    await removeAll();
    setOnlySaved(false);
    refresh();
  }

  async function view(e, d) {
    e.preventDefault(); // must happen before any await, or the link has already opened
    const blob = await savedFile(d.url);
    if (blob) setViewing({ title: label(d.name, lang), blob });
    else window.open(d.url, '_blank', 'noreferrer'); // removed in another tab meanwhile: open it online
  }

  async function listen(d) {
    const blob = await savedFile(d.audioUrl);
    setPlaying({ doc: d, src: blob ? URL.createObjectURL(blob) : d.audioUrl });
  }
  useEffect(() => () => { if (playing?.src.startsWith('blob:')) URL.revokeObjectURL(playing.src); }, [playing]);
  const closeViewer = useCallback(() => setViewing(null), []);

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
          {offline && docs.length > 0 && (
            <div className="row offline-bar">
              {savedHere.length > 0 && <button className="tag" aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}>{t.savedOnly(savedHere.length)}</button>}
              {bulk
                ? <>{t.saving(bulk.done, bulk.total)} <button className="tag" onClick={() => { stopBulk.current = true; }}>{t.stop}</button></>
                : savedHere.length < docs.length && <button className="tag" onClick={saveAll}>⤓ {t.saveAll(docs.length - savedHere.length)}</button>}
              {saved.size > 0 && used != null && <span className="meta">{t.used(mb(used))} · <button className="link" onClick={clearAll}>{t.removeAll}</button></span>}
            </div>
          )}
          {visible.length === 0 && <p className="empty">{docs.length ? t.empty : t.none}</p>}
          {visible.length > 0 && (
            <ul className="list">
              {visible.slice(0, limit).map((d) => {
                // Tags are left out to keep rows to one line; the tag buttons above still filter by them.
                const meta = d.size ? size(d.size) : '';
                const name = label(d.name, lang);
                const isOn = isSaved(saved, d);
                return (
                  <li className="item" key={d.id}>
                    {/* A saved document opens in the built-in viewer, which also works offline. */}
                    <a className="open" href={d.url} target="_blank" rel="noreferrer" title={t.open} onClick={isOn ? (e) => view(e, d) : undefined}>
                      <span className="name">{name}</span>
                      {meta && <span className="meta">{meta}</span>}
                    </a>
                    {d.audioUrl && <button className="mini" onClick={() => listen(d)} aria-label={`${t.listen}: ${name}`} title={t.listen}>{PLAY}</button>}
                    {/* Browsers ignore "download" for files on other sites, so only offer it for our own uploads. */}
                    {isBlobUrl(d.url) && <a className="mini" href={`${d.url}?download=1`} aria-label={`${t.download}: ${name}`} title={t.download}>{DOWNLOAD}</a>}
                    {offline && (
                      <button className={`mini save${isOn ? ' on' : ''}`} onClick={() => toggleSave(d)} disabled={working.has(d.id) || !!bulk}
                        aria-pressed={isOn} aria-label={`${isOn ? t.unsave : t.save}: ${name}`} title={isOn ? t.unsave : t.save}>
                        {working.has(d.id) ? <span className="spin" aria-hidden="true" /> : isOn ? SAVED : SAVE}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {visible.length > limit && (
            <p className="empty"><button className="btn alt" onClick={() => setLimit(limit + PAGE)}>{t.more(visible.length - limit)}</button></p>
          )}
        </>
      )}
      {playing && <Player doc={playing.doc} src={playing.src} lang={lang} onClose={() => setPlaying(null)} />}
      {viewing && <Viewer title={viewing.title} blob={viewing.blob} onClose={closeViewer} t={t} />}
      {note && <p className="toast" role="status">{note}</p>}
    </main>
  );
}
