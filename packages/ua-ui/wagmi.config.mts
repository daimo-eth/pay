import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

import latestUA from "../contract/broadcast/DeployUniversalAddressManager.s.sol/8453/run-latest.json" with { type: "json" };

/**
 * We get contract addresses from our latest Base mainnet deployments.
 * Because of CREATE2, all addresses are deterministic.
 */
const deployments = Object.fromEntries(
  [
    ...latestUA.transactions,
  ]
    .filter((t) => t.transactionType === "CREATE2")
    .map((r) => [r.contractName, r.contractAddress as `0x${string}`]),
);

export default defineConfig({
  out: "src/codegen/abis.ts",
  plugins: [
    foundry({
      project: "../contract",
      deployments,
      forge: { build: false },
      include: ["UniversalAddress*.sol/*", "UA*.sol/*"],
    }),
  ],
});
