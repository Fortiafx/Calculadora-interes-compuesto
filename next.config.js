/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/calculadora',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
