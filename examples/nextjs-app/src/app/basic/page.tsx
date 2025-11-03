"use client";

import * as Tokens from "@rozoai/intent-common";
import {
  baseUSDC,
  getChainName,
  getChainNativeToken,
  knownTokens,
} from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import { useEffect, useMemo, useState } from "react";
import { Address, getAddress, isAddress } from "viem";
import { Text } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel } from "../config-panel";
import { APP_ID, Container, usePersistedConfig } from "../shared";

type Config = {
  recipientAddress: string;
  recipientStellarAddress?: string;
  recipientSolanaAddress?: string;
  chainId: number;
  tokenAddress: string;
  amount: string;
};

const tempAddress = "0x0000000000000000000000000000000000000000" as Address;

export default function DemoBasic() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = usePersistedConfig("rozo-basic-config", {
    recipientAddress: "",
    recipientStellarAddress: "",
    recipientSolanaAddress: "",
    chainId: 0,
    tokenAddress: "",
    amount: "",
  } as Config);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [parsedConfig, setParsedConfig] = useState<Config | null>(null);
  const { resetPayment } = useRozoPayUI();

  const handleSetConfig = (config: Config) => {
    setConfig(config);
    setParsedConfig(config);
    resetPayment({
      toChain: config.chainId,
      toAddress: getAddress(config.recipientAddress),
      toStellarAddress: config.recipientStellarAddress,
      toSolanaAddress: config.recipientSolanaAddress,
      toUnits: config.amount,
      toToken: getAddress(config.tokenAddress),
    });
  };

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isConfigOpen) {
        setIsConfigOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isConfigOpen]);

  useEffect(() => {
    const getConfig = JSON.parse(
      localStorage.getItem("rozo-basic-config") || "{}"
    );

    if (getConfig && getConfig.chainId !== 0) {
      const parsedConfig = { ...getConfig };

      if (!isAddress(parsedConfig.tokenAddress)) {
        Object.assign(parsedConfig, {
          tokenAddress: tempAddress,
        });
      }

      if (!isAddress(parsedConfig.recipientAddress)) {
        Object.assign(parsedConfig, {
          recipientAddress: tempAddress,
        });
      }

      if (
        parsedConfig &&
        typeof parsedConfig === "object" &&
        "recipientAddress" in parsedConfig &&
        "chainId" in parsedConfig &&
        "tokenAddress" in parsedConfig
      ) {
        setConfig(parsedConfig);
        setParsedConfig(parsedConfig);
      }
    }
  }, []);

  // Only render the RozoPayButton when we have valid config
  const hasValidConfig =
    parsedConfig &&
    parsedConfig.recipientAddress &&
    parsedConfig.chainId &&
    parsedConfig.tokenAddress &&
    parsedConfig.amount;

  useEffect(() => {
    if (!hasValidConfig) {
      setCodeSnippet("");
      return;
    }

    // First check if it's a native token (address is 0x0)
    if (
      parsedConfig.tokenAddress ===
      Tokens.getChainNativeToken(parsedConfig.chainId)?.token
    ) {
      const tokenVarName =
        getChainName(parsedConfig.chainId).toLowerCase() +
        getChainNativeToken(parsedConfig.chainId)?.symbol;
      if (tokenVarName) {
        const snippet = `
        import { getAddress } from "viem";
        import { ${tokenVarName} } from "@rozoai/intent-common";

        <RozoPayButton
          appId="${APP_ID}"
          toChain={${tokenVarName}.chainId}
          toAddress={getAddress("${parsedConfig.recipientAddress}")}
          ${
            parsedConfig.recipientStellarAddress
              ? `toStellarAddress={"${parsedConfig.recipientStellarAddress}"}`
              : ""
          }
          ${
            parsedConfig.recipientSolanaAddress
              ? `toSolanaAddress={"${parsedConfig.recipientSolanaAddress}"}`
              : ""
          }
          toUnits={"${parsedConfig.amount}"}
          toToken={getAddress(${tokenVarName}.token)}
        />`;
        setCodeSnippet(snippet);
        return;
      }
    }

    // For non-native tokens
    const token = knownTokens.find(
      (t: any) =>
        t.token === parsedConfig.tokenAddress &&
        t.chainId === parsedConfig.chainId
    );
    if (!token) return;

    // Find the variable name in pay-common exports
    const tokenVarName =
      Object.entries(Tokens).find(([_, t]) => t === token)?.[0] || token.symbol;

    const snippet = `
    import { getAddress} from "viem";
    import { ${tokenVarName}} from "@rozoai/intent-common";

<RozoPayButton
     appId="${APP_ID}"
     toChain={${tokenVarName}.chainId}
     toAddress={getAddress("${parsedConfig.recipientAddress}")}
 ${`${
   parsedConfig.recipientStellarAddress
     ? `toStellarAddress={"${parsedConfig.recipientStellarAddress}"}`
     : parsedConfig.recipientSolanaAddress
     ? `toSolanaAddress={"${parsedConfig.recipientSolanaAddress}"}`
     : ""
 }
     toUnits={"${parsedConfig.amount}"}
     toToken={getAddress(${tokenVarName}.token)}`}
 />`;
    setCodeSnippet(snippet);
  }, [parsedConfig, hasValidConfig]);

  const metadata = useMemo(() => {
    return {
      orderDate: new Date().toISOString(),
      // customDeeplinkUrl: `https://ns.rozo.ai/ns/zen?amount=${parsedConfig?.amount}`,
      // payer: {
      //   paymentOptions: [ExternalPaymentOptions.Stellar],
      // },
    };
  }, []);

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        This demo shows how you can accept a basic payment from any coin on any
        chain. Configure the recipient to make a payment to yourself.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {Boolean(hasValidConfig) && parsedConfig ? (
          <>
            <RozoPayButton
              appId={APP_ID}
              toChain={parsedConfig.chainId}
              toAddress={getAddress(parsedConfig.recipientAddress)}
              toStellarAddress={parsedConfig.recipientStellarAddress}
              toSolanaAddress={parsedConfig.recipientSolanaAddress}
              toUnits={parsedConfig.amount}
              toToken={getAddress(parsedConfig.tokenAddress)}
              onPaymentCompleted={(e) => {
                console.log("onPaymentCompleted", e);
              }}
              resetOnSuccess={true}
              metadata={metadata}
              showProcessingPayout
            />
            <button
              onClick={() => setIsConfigOpen(true)}
              className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-medium transition-all"
            >
              Configure Payment
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-medium transition-all"
          >
            Create a Payment
          </button>
        )}

        {/* Only show implementation code if we have a complete config */}
        {Boolean(hasValidConfig) && (
          <div className="w-full">
            <Text className="text-lg font-medium text-primary-dark mb-2">
              Implementation Code
            </Text>
            <CodeSnippet codeSnippet={codeSnippet} />
          </div>
        )}

        <ConfigPanel
          configType="payment"
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfirm={handleSetConfig}
          defaultRecipientAddress={config.recipientAddress}
        />

        {parsedConfig?.recipientStellarAddress ||
        parsedConfig?.recipientSolanaAddress ? (
          <div className="text-sm text-gray-600 text-left">
            <p className="mb-2">
              <strong>Note:</strong>
            </p>
            <ul className="list-disc list-inside mb-2">
              <li>
                When using <code>toStellarAddress</code> or{" "}
                <code>toSolanaAddress</code>, you must set:
              </li>
              <li>
                <code>toChain</code> to Base Chain ({baseUSDC.chainId})
              </li>
              <li>
                <code>toToken</code> to Base USDC ({baseUSDC.token})
              </li>
              <li>
                The <code>toAddress</code> can be any valid EVM address in this
                case.
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
