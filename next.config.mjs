/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["ws", "@neondatabase/serverless"],
  },
};

export default nextConfig;
