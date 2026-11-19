import type { NextConfig } from "next";
import { readAccountSettings } from "./lib/account/accountConfig";
import { closeupsAvailable } from "./lib/closeupCache";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: false,
  devIndicators: false,
  // The dev server gzips each response as it is asked for: 5 to 20 times slower than plain for the multi-megabyte JSON files, with nothing to gain over loopback.
  compress: process.env.NODE_ENV === "production",
  // A check build beside a running dev server: ATLAS_DIST_DIR=.next-check npx next build (docs/deploy.md).
  distDir: process.env.ATLAS_DIST_DIR || ".next",
  // Tells the page whether accounts are on, without telling it any setting: lib/account/accountConfig.ts, docs/accounts.md.
  // Likewise for terrain close-ups, so the page offers none where the server would refuse them (lib/placeResources.ts).
  env: {
    NEXT_PUBLIC_ATLAS_ACCOUNTS: readAccountSettings(process.env) ? "on" : "",
    NEXT_PUBLIC_ATLAS_CLOSEUPS: closeupsAvailable(process.env) ? "on" : "",
  },
  // app/page.tsx reads this file from disk when it exists; a serverless bundle holds only traced files.
  outputFileTracingIncludes: { "/": ["./public/terrain/regions/sanliurfa/metadata.json"] },
  // The close-up route names public/ and the Python virtualenv by path, so the tracer would pack both (over 500 MB) into its bundle.
  // A serverless host refuses close-ups before either is read (closeupsAvailable in lib/closeupCache.ts).
  outputFileTracingExcludes: { "/api/closeup": ["./public/**", "./scripts/**", "../../.venv/**", "**/.venv/**"] },
};

export default nextConfig;
