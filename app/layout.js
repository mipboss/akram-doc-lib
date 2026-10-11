import './globals.css';

export const metadata = { title: 'PDF Library', description: 'Find and download documents by category, name or tag.', manifest: '/manifest.json' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1d3557' };

export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
