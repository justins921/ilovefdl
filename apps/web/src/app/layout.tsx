import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'I Love FDL - Shop Local Fond du Lac',
  description:
    'Your community platform for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials. Love where you live.',
  keywords: [
    'Fond du Lac',
    'FDL',
    'Wisconsin',
    'local shopping',
    'community news',
    'bar specials',
    'Lake Winnebago',
    'shop local',
  ],
  openGraph: {
    title: 'I Love FDL - Shop Local Fond du Lac',
    description:
      'Your community platform for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials.',
    siteName: 'I Love FDL',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
