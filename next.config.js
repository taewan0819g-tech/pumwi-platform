/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mqrndqairlombdfvzoxn.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
const withNextIntl = require('next-intl/plugin')()
module.exports = withNextIntl(nextConfig)
