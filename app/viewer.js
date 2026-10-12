'use client';
import { useEffect, useRef, useState } from 'react';

// PDF.js draws each page onto a canvas inside the app, so saved PDFs open offline and inside the installed
// iPhone app, where the browser's own PDF viewer is not available. The legacy build supports older phones.
let pdfjs;
export async function loadPdfjs() {
  if (!pdfjs) {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
  return pdfjs;
}

// Loads the viewer's code once while online, so the service worker has a copy for offline use.
export async function prepareViewer() {
  try {
    const lib = await loadPdfjs();
    await fetch(lib.GlobalWorkerOptions.workerSrc);
  } catch {}
}

// Draws one page when it is near the screen and clears it when far away, so long books do not run out of memory.
function Page({ pdf, n, width }) {
  const canvas = useRef(null);
  const [near, setNear] = useState(false);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '1500px 0px' });
    io.observe(canvas.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!near) { el.width = 0; el.height = 0; return; }
    let task;
    pdf.getPage(n).then((page) => {
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const viewport = page.getViewport({ scale: (width / base.width) * Math.min(window.devicePixelRatio || 1, 2) });
      el.width = viewport.width;
      el.height = viewport.height;
      task = page.render({ canvas: el, canvasContext: el.getContext('2d'), viewport });
      return task.promise;
    }).catch(() => {});
    return () => task?.cancel();
  }, [near, width, pdf, n]);

  return <canvas ref={canvas} className="page" style={{ width, height: width * ratio }} aria-label={`Page ${n}`} />;
}

export default function Viewer({ title, blob, onClose, t }) {
  const [pdf, setPdf] = useState(null);
  const [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(0);
  const box = useRef(null);

  useEffect(() => {
    let task;
    (async () => {
      const lib = await loadPdfjs();
      task = lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      setPdf(await task.promise);
    })().catch(() => setErr(true));
    return () => { task?.destroy(); };
  }, [blob]);

  useEffect(() => {
    const measure = () => setFit(Math.min(box.current.clientWidth - 16, 900));
    measure();
    addEventListener('resize', measure);
    const esc = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('resize', measure); removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="viewer-bar">
        <button className="mini" onClick={onClose} aria-label={t.close}>✕</button>
        <span className="title">{title}</span>
        {pdf && <span className="count">{t.pages(pdf.numPages)}</span>}
        <button className="mini" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label={t.zoomOut}>−</button>
        <button className="mini" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label={t.zoomIn}>+</button>
      </div>
      <div className="viewer-pages" ref={box}>
        {err && <p className="empty">{t.cantShow}</p>}
        {!pdf && !err && <p className="empty">…</p>}
        {pdf && fit > 0 && Array.from({ length: pdf.numPages }, (_, i) => <Page key={i} pdf={pdf} n={i + 1} width={Math.round(fit * zoom)} />)}
      </div>
    </div>
  );
}
