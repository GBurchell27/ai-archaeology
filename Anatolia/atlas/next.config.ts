import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  devIndicators: false,
  // The dev server gzips each response as it is asked for: 5 to 20 times slower than plain for the multi-megabyte JSON files, with nothing to gain over loopback.
  compress: process.env.NODE_ENV === "production",
};

export default nextConfig;
