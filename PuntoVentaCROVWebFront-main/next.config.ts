import type { NextConfig } from "next";

// Use an environment variable so the proxy target can be configured for
// different deployments. Defaults to the local API used during development.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Forward everything from /backend/... to the API defined above
      { source: "/backend/:path*", destination: `${API_URL}/:path*` },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }, // ← temporal
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pvw-productos.s3.us-east-2.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "spinnegocion.s3.us-east-2.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
