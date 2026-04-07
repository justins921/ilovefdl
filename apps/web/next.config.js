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
