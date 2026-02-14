/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  // sql.js uses WASM — externalize on server, configure for browser
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("sql.js");
    } else {
      // sql.js tries to require 'fs' and 'path' — provide empty fallbacks for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
