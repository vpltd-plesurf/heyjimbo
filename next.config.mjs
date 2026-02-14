/** @type {import('next').NextConfig} */
const nextConfig = {
  // sql.js uses WASM — allow it in server-side API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("sql.js");
    }
    return config;
  },
};

export default nextConfig;
