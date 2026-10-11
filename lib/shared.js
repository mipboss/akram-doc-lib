// Helpers used by both server and browser code.

export const isBlobUrl = (u) => /\.blob\.vercel-storage\.com\//.test(u || '');

// Shows a name in the chosen language ('en' or 'gu'), falling back to the other one.
export const label = (n, lang) => n?.[lang] || n?.en || n?.gu || '';

export const byKey = (a, b) =>
  (a.sortKey || label(a.name, 'en')).localeCompare(b.sortKey || label(b.name, 'en'), undefined, { numeric: true, sensitivity: 'base' });

export const size = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
