import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  devIndicators: false,
};

export default nextConfig;
