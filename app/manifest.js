// Served at /manifest.webmanifest. Browsers read it to install the site as an app: its name, icons,
// start page and colours. Next.js adds the <link rel="manifest"> tag to every page automatically.
export default function manifest() {
  return {
    name: 'PDF Library',
    short_name: 'PDF Library',
    description: 'Find, read and listen to documents by collection, name or tag.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#1d3557',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
