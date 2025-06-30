/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.spotify.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https://*.scdn.co;
              media-src 'self' https://*.spotify.com;
              connect-src 'self' https://api.spotify.com https://accounts.spotify.com;
              frame-src 'self' https://accounts.spotify.com;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;