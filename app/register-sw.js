'use client';
import { useEffect } from 'react';

// Installs the service worker (public/sw.js). Skipped in development, where stored copies would hide code changes.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
