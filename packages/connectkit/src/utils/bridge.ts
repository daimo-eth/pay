import {
  base,
  baseUSDC,
  bscUSDT,
  getChainById,
  getKnownToken,
  polygonUSDC,
  RozoPayHydratedOrderWithOrg,
  RozoPayIntentStatus,
  RozoPayOrderMode,
  RozoPayOrderStatusDest,
  RozoPayOrderStatusSource,
  RozoPayUserMetadata,
  rozoSolanaUSDC,
  rozoStellar,
  rozoStellarUSDC,
  WalletPaymentOption,
} from "@rozoai/intent-common";
import { parseUnits } from "viem";
import { STELLAR_USDC_ISSUER_PK } from "../constants/rozoConfig";
import { PaymentResponseData } from "./api";

export interface PaymentBridgeConfig {
  toChain: number;
  toToken: string;
  toAddress?: string;
  toStellarAddress?: string;
  toSolanaAddress?: string;
  toUnits: string;
  walletPaymentOption?: WalletPaymentOption;
}

export interface PreferredPaymentConfig {
  preferredChain: string;
  preferredToken: "USDC" | "USDT" | "XLM";
  preferredTokenAddress?: `0x${string}`;
}

export interface DestinationConfig {
  destinationAddress?: string;
  chainId: string;
  amountUnits: string;
  tokenSymbol: string;
  tokenAddress: string;
}

/**
 * Bridge helper for determining payment routing based on destination chain/token
 * and selected wallet payment option.
 *
 * This helper centralizes the logic for:
 * - Determining preferred payment chain/token based on wallet selection
 * - Setting up destination configuration for cross-chain payments
 * - Handling special cases for Stellar and Solana addresses
 */
export function createPaymentBridgeConfig({
  toChain = baseUSDC.chainId,
  toToken = baseUSDC.token,
  toAddress,
  toStellarAddress,
  toSolanaAddress,
  toUnits,
  walletPaymentOption,
}: PaymentBridgeConfig): {
  preferred: PreferredPaymentConfig;
  destination: DestinationConfig;
} {
  // Default configuration for Base USDC payments
  let preferred: PreferredPaymentConfig = {
    preferredChain: String(toChain),
    preferredToken: "USDC",
  };

  let destination: DestinationConfig = {
    destinationAddress: toAddress,
    chainId: String(toChain),
    amountUnits: toUnits,
    tokenSymbol: "USDC",
    tokenAddress: toToken,
  };

  // Only apply bridge logic for Base USDC destination
  if (toChain === base.chainId && toToken === baseUSDC.token) {
    // Determine preferred payment method based on wallet selection
    if (walletPaymentOption) {
      const selectedToken = walletPaymentOption.required.token.token;

      // Pay In USDC Polygon
      if (selectedToken === polygonUSDC.token) {
        console.log("[createPaymentBridgeConfig] Pay In USDC Polygon");
        preferred = {
          preferredChain: String(polygonUSDC.chainId),
          preferredToken: "USDC",
          preferredTokenAddress: polygonUSDC.token as `0x${string}`,
        };
      }
      // Pay In USDC Solana
      else if (selectedToken === rozoSolanaUSDC.token) {
        console.log("[createPaymentBridgeConfig] Pay In USDC Solana");
        preferred = {
          preferredChain: String(rozoSolanaUSDC.chainId),
          preferredToken: "USDC",
        };
      }
      // Pay In USDC Stellar
      else if (selectedToken === rozoStellarUSDC.token) {
        console.log("[createPaymentBridgeConfig] Pay In USDC Stellar");
        preferred = {
          preferredChain: String(rozoStellarUSDC.chainId),
          preferredToken: "USDC",
        };
      }
      // Pay In USDT BSC
      else if (selectedToken === bscUSDT.token) {
        console.log("[createPaymentBridgeConfig] Pay In USDT BSC");
        preferred = {
          preferredChain: String(bscUSDT.chainId),
          preferredToken: "USDT",
        };
      }
    }

    // Determine destination based on special address types
    if (toStellarAddress) {
      console.log("[createPaymentBridgeConfig] Pay Out USDC Stellar");
      destination = {
        destinationAddress: toStellarAddress,
        chainId: String(rozoStellar.chainId),
        amountUnits: toUnits,
        tokenSymbol: "USDC",
        tokenAddress: `USDC:${STELLAR_USDC_ISSUER_PK}`,
      };
    } else if (toSolanaAddress) {
      console.log("[createPaymentBridgeConfig] Pay Out USDC Solana");
      destination = {
        destinationAddress: toSolanaAddress,
        chainId: String(rozoSolanaUSDC.chainId),
        amountUnits: toUnits,
        tokenSymbol: "USDC",
        tokenAddress: rozoSolanaUSDC.token,
      };
    } else {
      console.log("[createPaymentBridgeConfig] Pay Out USDC Base");
      // Keep default Base configuration
    }
  }

  return { preferred, destination };
}

/**
 * Format a payment response data to a hydrated order
 * @param order
 * @returns
 */
export function formatPaymentResponseDataToHydratedOrder(
  order: PaymentResponseData
): RozoPayHydratedOrderWithOrg {
  const destChain = getChainById(Number(order.destination.chainId));
  const destToken = getKnownToken(
    destChain.chainId,
    order.destination.tokenAddress
  );

  if (!destToken) {
    throw new Error(
      `Token ${order.destination.tokenSymbol} not found for chain ${destChain.chainId}`
    );
  }

  const destAddress = order.metadata.receivingAddress as `0x${string}`;

  return {
    id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    mode: RozoPayOrderMode.HYDRATED,
    intentAddr: destAddress,
    handoffAddr: destAddress,
    escrowContractAddress: destAddress,
    bridgerContractAddress: destAddress,
    bridgeTokenOutOptions: [
      {
        token: {
          chainId: destChain.chainId,
          token: destToken.token ?? "",
          symbol: destToken.symbol ?? "",
          usd: 1,
          priceFromUsd: 1,
          decimals: destToken.decimals ?? 18,
          displayDecimals: 2,
          logoSourceURI: destToken.logoSourceURI ?? "",
          logoURI: destToken.logoURI ?? "",
          maxAcceptUsd: 100000,
          maxSendUsd: 0,
        },
        amount: parseUnits(
          order.destination.amountUnits,
          destToken.decimals ?? 18
        ).toString() as `${bigint}`,
        usd: Number(order.destination.amountUnits),
      },
    ],
    selectedBridgeTokenOutAddr: null,
    selectedBridgeTokenOutAmount: null,
    destFinalCallTokenAmount: {
      token: {
        chainId: destChain.chainId,
        token: destToken.token ?? "",
        symbol: "USDC",
        usd: 1,
        priceFromUsd: 1,
        decimals: destToken.decimals ?? 18,
        displayDecimals: 2,
        logoSourceURI: destToken.logoSourceURI ?? "",
        logoURI: destToken.logoURI ?? "",
        maxAcceptUsd: 100000,
        maxSendUsd: 0,
      },
      amount: parseUnits(
        order.destination.amountUnits,
        destToken.decimals ?? 18
      ).toString() as `${bigint}`,
      usd: Number(order.destination.amountUnits),
    },
    usdValue: Number(order.destination.amountUnits),
    destFinalCall: {
      to: destAddress,
      value: BigInt("0"),
      data: "0x",
    },
    refundAddr: (order.source?.sourceAddress as `0x${string}`) || null,
    nonce: order.nonce as unknown as bigint,
    sourceTokenAmount: null,
    sourceFulfillerAddr: null,
    sourceInitiateTxHash: null,
    sourceStartTxHash: null,
    sourceStatus: RozoPayOrderStatusSource.WAITING_PAYMENT,
    destStatus: RozoPayOrderStatusDest.PENDING,
    intentStatus: RozoPayIntentStatus.UNPAID,
    destFastFinishTxHash: null,
    destClaimTxHash: null,
    // passedToAddress: null,
    redirectUri: null,
    // sourceInitiateUpdatedAt: null,
    createdAt: Math.floor(Date.now() / 1000),
    lastUpdatedAt: Math.floor(Date.now() / 1000),
    orgId: order.orgId as string,
    metadata: {
      ...(order?.metadata ?? {}),
      ...(order.userMetadata ?? {}),
      ...(order.metadata ?? {}),
      daimoOrderId: order?.id ?? null,
    } as any,
    externalId: order.externalId as string | null,
    userMetadata: order.userMetadata as RozoPayUserMetadata | null,
    expirationTs: BigInt("1756990145"),
    org: {
      orgId: order.orgId as string,
      name: "Pay Rozo",
    },
  };
}
