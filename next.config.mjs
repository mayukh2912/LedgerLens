/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded sheets are processed in-memory inside the serverless function,
  // so we raise the default body size limit for the App Router route.
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
