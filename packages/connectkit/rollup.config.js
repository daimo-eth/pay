import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Build bundle: index.js
  {
    input: ["./src/index.ts"],
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
        exclude: "node_modules/**",
        outputToFilesystem: false,
        declaration: true,
        declarationDir: "build",
        sourceMap: true,
      }),
    ],
  },
  // Build types: index.d.ts
  {
    input: "./src/index.ts",
    output: { file: "build/index.d.ts", format: "esm" },
    external: ["../package.json"],
    plugins: [
      dts({
        compilerOptions: {
          preserveValueImports: false,
        },
      }),
    ],
  },
];
