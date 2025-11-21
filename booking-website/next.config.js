/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      // Add your Supabase storage domain here
      // e.g., 'xxxxx.supabase.co'
    ],
  },
}

module.exports = nextConfig

