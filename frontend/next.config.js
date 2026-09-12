/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'standalone' for Render node service (uses npm start directly)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
