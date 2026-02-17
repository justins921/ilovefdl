/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ilovefdl.com', 'www.ilovefdl.com', 'localhost'],
  },
  transpilePackages: ['@ilovefdl/shared'],
};

module.exports = nextConfig;
