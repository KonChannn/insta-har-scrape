import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Instagram HAR Analyzer',
  description:
    'Analyze an Instagram HAR capture entirely in your browser: engagement, posting time, audience behavior and content insights. Nothing is uploaded.',
  applicationName: 'Instagram HAR Analyzer',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f3' },
    { media: '(prefers-color-scheme: dark)', color: '#111110' },
  ],
};

// Applies the saved theme/locale before paint to avoid a flash.
const boot = `(function(){try{var t=localStorage.getItem('igHarAnalyzer.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}var l=localStorage.getItem('igHarAnalyzer.locale');if(l==='id'||l==='en'){document.documentElement.lang=l;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
