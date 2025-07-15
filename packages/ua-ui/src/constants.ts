import { knownTokens } from "@daimo/pay-common";
import { arbitrum, base, optimism, polygon, worldchain } from "@wagmi/core/chains";
import { getAddress, zeroAddress } from "viem";

// Contract addresses on Base (chain ID 8453)
export const UA_INTENT_FACTORY_ADDRESS = getAddress(
  "0x81400662f5516a2c96f87c907c7fad956dc7dc5a"
);
export const UA_IMPL_ADDRESS = getAddress(
  "0x117cf310C022f59e840E5d320a9cEB7C5351dBe2"
);
export const UNIVERSAL_ADDRESS_BRIDGER_ADDRESS = getAddress(
  "0xB64bC50054ee047E45D60A0fcaBfA127ca18a95a"
);
export const UA_SHARED_CONFIG_ADDRESS = getAddress(
  "0xa047c7c7E6d57a6CCa6134cf85310284A2Fe6EA2"
);
export const UNIVERSAL_ADDRESS_MANAGER_ADDRESS = getAddress(
  "0x24cD6C3730152cCa1e26597396ab8A690B0AbAee"
);

export const viemChains = [base, optimism, arbitrum, polygon, worldchain] as const;

export const knownErc20Tokens = knownTokens.filter(
  (t) =>
    viemChains.find(c => c.id === t.chainId) && t.token !== zeroAddress
);
