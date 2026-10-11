import './globals.css';

export const metadata = { title: 'PDF Library', description: 'Find, read and listen to documents by collection, name or tag.', manifest: '/manifest.json' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1d3557' };

// Applies a saved light/dark choice before the page paints, so it never flashes the wrong theme.
const THEME = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
