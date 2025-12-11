import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
