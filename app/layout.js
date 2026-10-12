import './globals.css';
import RegisterServiceWorker from './register-sw';

export const metadata = {
  title: 'PDF Library',
  description: 'Find, read and listen to documents by collection, name or tag.',
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
  // iPhone and iPad: open full screen from the Home Screen, under this name.
  appleWebApp: { capable: true, title: 'PDF Library', statusBarStyle: 'default' },
};
export const viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1d3557' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1620' },
  ],
};

// Applies a saved light/dark choice before the page paints, so it never flashes the wrong theme.
const THEME = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
