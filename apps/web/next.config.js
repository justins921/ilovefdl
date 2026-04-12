/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ilovefdl.com' },
      { protocol: 'https', hostname: 'www.ilovefdl.com' },
      { protocol: 'https', hostname: '*.ilovefdl.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.railway.app' },
      { protocol: 'https', hostname: '*.up.railway.app' },
      // WordPress CDN domains (Jetpack image optimization)
      { protocol: 'https', hostname: 'i0.wp.com' },
      { protocol: 'https', hostname: 'i1.wp.com' },
      { protocol: 'https', hostname: 'i2.wp.com' },
      { protocol: 'https', hostname: 'i3.wp.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
    ],
  },
  transpilePackages: ['@ilovefdl/shared'],
  async redirects() {
    return [
      { source: '/shop', destination: '/marketplace', permanent: true },
      { source: '/blog/:slug*', destination: '/news/:slug*', permanent: true },
      { source: '/listing/:slug*', destination: '/bars/:slug*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
