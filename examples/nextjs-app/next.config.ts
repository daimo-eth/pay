import type { NextConfig } from "next";

// Define the monorepo packages we want to use locally
const monoRepoPackages = ["@rozoai/intent-pay", "@rozoai/intent-common"];

// Check if we're using local packages
const useLocalPackages = process.env.NEXT_USE_LOCAL_PACKAGES === "true";

// Base Next.js configuration
const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Always transpile the monorepo packages to ensure proper handling of React features
  transpilePackages: monoRepoPackages,
};

export default nextConfig;
