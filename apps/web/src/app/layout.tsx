import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import CartProvider from '@/components/CartProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LocalBusinessSchema } from '@/components/StructuredData';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilovefdl.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s | I Love FDL',
    default: 'I Love FDL - Support Local Fond du Lac',
  },
  description:
    'Your community marketplace for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials. Support local and love where you live.',
  keywords: [
    'Fond du Lac',
    'FDL',
    'Wisconsin',
    'local shopping',
    'community marketplace',
    'community news',
    'bar specials',
    'Lake Winnebago',
    'shop local',
    'handmade goods',
    'local vendors',
  ],
  openGraph: {
    title: 'I Love FDL - Support Local Fond du Lac',
    description:
      'Your community marketplace for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials.',
    siteName: 'I Love FDL',
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'I Love FDL - Support Local Fond du Lac',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'I Love FDL - Support Local Fond du Lac',
    description:
      'Your community marketplace for Fond du Lac, Wisconsin. Discover local vendors, shop handmade goods, read community news, and find daily bar specials.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE_URL,
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
        <LocalBusinessSchema />
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
