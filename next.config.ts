import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  serverExternalPackages: ["jsdom", "undici"],
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Image domains if using next/image with external URLs
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
