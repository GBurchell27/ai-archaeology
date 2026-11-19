import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  devIndicators: false,
  // The dev server gzips each response as it is asked for: 5 to 20 times slower than plain for the multi-megabyte JSON files, with nothing to gain over loopback.
  compress: process.env.NODE_ENV === "production",
  // A check build beside a running dev server: ATLAS_DIST_DIR=.next-check npx next build (docs/deploy.md).
  distDir: process.env.ATLAS_DIST_DIR || ".next",
  // app/page.tsx reads this file from disk when it exists; a serverless bundle holds only traced files.
  outputFileTracingIncludes: { "/": ["./public/terrain/regions/sanliurfa/metadata.json"] },
  // The close-up route names public/ and the Python virtualenv by path, so the tracer would pack both (over 500 MB) into its bundle.
  // A serverless host refuses close-ups before either is read (closeupsAvailable in lib/closeupCache.ts).
  outputFileTracingExcludes: { "/api/closeup": ["./public/**", "./scripts/**", "../../.venv/**", "**/.venv/**"] },
};

export default nextConfig;
