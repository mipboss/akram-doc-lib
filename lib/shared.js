// Helpers used by both server and browser code.

export const isBlobUrl = (u) => /\.blob\.vercel-storage\.com\//.test(u || '');

// Shows a name in the chosen language ('en' or 'gu'), falling back to the other one.
export const label = (n, lang) => n?.[lang] || n?.en || n?.gu || '';

const compare = (a, b, lang) => a.localeCompare(b, lang === 'gu' ? 'gu' : 'en', { numeric: true, sensitivity: 'base', ignorePunctuation: true });

// Orders a collection's documents: by sort key (falling back to the English name), or, when the collection
// is set to sort by name, by the name shown in the reader's language.
export const docOrder = (coll, lang) => (coll?.sort === 'name'
  ? (a, b) => compare(label(a.name, lang), label(b.name, lang), lang)
  : (a, b) => compare(a.sortKey || label(a.name, 'en'), b.sortKey || label(b.name, 'en'), 'en'));

export const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

// What administrators may upload, to either store.
export const UPLOAD_TYPES = ['application/pdf', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm'];
export const MAX_UPLOAD = 500 * 1024 * 1024;
