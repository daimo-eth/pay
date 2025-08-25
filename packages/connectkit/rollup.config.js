import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
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
      "@wagmi/core",
      "porto",
      "porto/wagmi",
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
      resolve({
        browser: true,
        preferBuiltins: false,
        exportConditions: ["browser", "module", "default"],
        mainFields: ["browser", "module", "main"],
        extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
      }),
      commonjs({
        transformMixedEsModules: true,
        requireReturnsDefault: "auto", // fixes default import of CJS like eventemitter3
      }),
      json(),
      typescript({
        declaration: true,
        declarationDir: "build",
        rootDir: "src",
        tsconfig: "./tsconfig.json",
        // Ensure only our sources are type-checked/emitted
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: ["node_modules/**", "build/**"],
      }),
      esbuild({
        include: /src\/.*\.[jt]sx?$/,
        target: "esnext",
        jsx: "automatic",
      }),
    ],
    onwarn(warn, defaultHandler) {
      // silence noisy but harmless warnings
      if (
        warn.code === "MODULE_LEVEL_DIRECTIVE" &&
        /"use client"/.test(warn.message)
      )
        return;
      if (warn.code === "THIS_IS_UNDEFINED") return;
      if (
        warn.code === "CIRCULAR_DEPENDENCY" &&
        /porto\/node_modules\/ox\/_esm\/core\//.test(warn.message)
      )
        return;
      defaultHandler(warn);
    },
  },
  // Types: emit bundled .d.ts for public entrypoints
  {
    input: {
      index: "./src/index.ts",
      world: "./src/world.ts",
    },
    output: {
      dir: "build",
      format: "esm",
      entryFileNames: "[name].d.ts",
    },
    plugins: [dts()],
  },
];
