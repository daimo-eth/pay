import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

/** @type {import('rollup').RollupOptions[]} */
export default [
  // Build bundle: index.js
  {
    input: ["./src/index.ts"],
    external: ["react", "react-dom", "framer-motion", "wagmi"],
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
      }),
    ],
  },
  // Build types: index.d.ts
  {
    input: "./build/pay/packages/connectkit/src/index.d.ts",
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
