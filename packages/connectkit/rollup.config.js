import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Build a folder of files for better tree-shaking
  {
    input: ["./src/index.ts", "./src/world.ts"],
    external: [
      "react",
      "react-dom",
      "framer-motion",
      "wagmi",
      "@daimo/pay-common",
      "buffer",
      "styled-components",
      "@wagmi/connectors",
      "@solana/wallet-adapter-react",
      "@trpc/client",
      "react-use-measure",
      "@solana/web3.js",
      "react-transition-state",
      "@solana/wallet-adapter-base",
      "detect-browser",
      "resize-observer-polyfill",
      "qrcode",
    ],
    output: [
      {
        dir: "build",
        format: "esm",
        sourcemap: true,
        preserveModules: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      json(),
      typescript({
        declaration: true,
        declarationDir: "build",
        rootDir: "src",
        tsconfig: "./tsconfig.json",
      }),
    ],
  },
];
