/** @type {import('next').NextConfig} */
const path = require("path");

// Define the monorepo packages we want to use locally
const monoRepoPackages = ["@rozoai/intent-pay", "@rozoai/intent-common"];

// Check if we're using local packages
const useLocalPackages = process.env.NEXT_USE_LOCAL_PACKAGES === "true";

// Base Next.js configuration
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Always transpile the monorepo packages to ensure proper handling of React features
  transpilePackages: monoRepoPackages,
};

// Add webpack configuration for local package development
if (useLocalPackages) {
  // Create a mapping of package paths
  const packagePaths = {
    "@rozoai/intent-pay": path.resolve(__dirname, "../../packages/connectkit"),
    "@rozoai/intent-common": path.resolve(
      __dirname,
      "../../packages/pay-common"
    ),
  };

  // Configure webpack to use local packages
  nextConfig.webpack = (config, { isServer }) => {
    // For each monorepo package, resolve it to the actual path
    Object.entries(packagePaths).forEach(([packageName, packagePath]) => {
      // Add the package path to the webpack resolution aliases
      config.resolve.alias[packageName] = packagePath;
    });

    // Ensure we preserve the original module resolution for React
    config.resolve.alias["react"] = path.resolve(
      __dirname,
      "node_modules/react"
    );
    config.resolve.alias["react-dom"] = path.resolve(
      __dirname,
      "node_modules/react-dom"
    );
    config.resolve.alias["wagmi"] = path.resolve(
      __dirname,
      "node_modules/wagmi"
    );
    config.resolve.alias["viem"] = path.resolve(__dirname, "node_modules/viem");

    return config;
  };
}

module.exports = nextConfig;
