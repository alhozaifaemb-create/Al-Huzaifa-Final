import type { Metadata, Viewport } from 'next';
import './globals.css';

// 🟢 1. VIEWPORT: Controls Status Bar Color & Zoom (Must be separate now)
export const viewport: Viewport = {
  themeColor: '#1E8449',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming to make it feel like a real app
};

// 🟢 2. METADATA: App Details & Manifest Link
export const metadata: Metadata = {
  title: 'Al Huzaifa Digital - Premium Tailoring',
  description: 'Premium tailoring business management PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Al Huzaifa Digital',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Next.js automatically generates the <head> from the config above */}
      <body>{children}</body>
    </html>
  );
}