"use client";

import * as Tokens from "@rozoai/intent-common";
import {
  baseUSDC,
  getChainName,
  getChainNativeToken,
  knownTokens,
} from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import { useEffect, useState } from "react";
import { Address, getAddress, isAddress } from "viem";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel } from "../config-panel";
import { APP_ID, Container, printEvent, usePersistedConfig } from "../shared";

type Config = {
  recipientAddress: string;
  recipientStellarAddress?: string;
  recipientSolanaAddress?: string;
  chainId: number;
  tokenAddress: string;
};

const tempAddress = "0x0000000000000000000000000000000000000000" as Address;

export default function DemoDeposit() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = usePersistedConfig("rozo-deposit-config", {
    recipientAddress: "",
    recipientStellarAddress: "",
    recipientSolanaAddress: "",
    chainId: 0,
    tokenAddress: "",
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
      toToken: getAddress(config.tokenAddress),
    });
  };

  // Only render the RozoPayButton when we have valid config
  const hasValidConfig =
    parsedConfig &&
    parsedConfig.recipientAddress &&
    parsedConfig.chainId &&
    parsedConfig.tokenAddress;

  // Add escape key handler
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
      localStorage.getItem("rozo-deposit-config") || "{}"
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

  useEffect(() => {
    // Only generate code snippet if we have a complete config
    if (!hasValidConfig) {
      setCodeSnippet("");
      return;
    }

    // First check if it's a native token (address is 0x0)
    if (
      parsedConfig.tokenAddress ===
      getChainNativeToken(parsedConfig.chainId)?.token
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
          toToken={getAddress(${tokenVarName}.token)}
          intent="Deposit"
        />`;
        setCodeSnippet(snippet);
        return;
      }
    }

    // For non-native tokens
    if (parsedConfig.chainId != 0) {
      const token = knownTokens.find(
        (t) => t.token === parsedConfig.tokenAddress
      );
      if (!token) return;

      // Find the variable name in pay-common exports
      const tokenVarName =
        Object.entries(Tokens).find(([_, t]) => t === token)?.[0] ||
        token.symbol;

      const snippet = `import { getAddress} from "viem";
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
  toToken={getAddress(${tokenVarName}.token)}`}
  intent="Deposit"
/>`;
      setCodeSnippet(snippet);
    }
  }, [parsedConfig, hasValidConfig]);

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        Onboard users to your app using the tokens they already own on other
        chains. Users can customize their deposit amount.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {Boolean(hasValidConfig) && parsedConfig ? (
          <>
            <RozoPayButton
              appId={APP_ID}
              toChain={parsedConfig.chainId}
              toAddress={getAddress(parsedConfig.recipientAddress)}
              toToken={getAddress(parsedConfig.tokenAddress)}
              toStellarAddress={parsedConfig.recipientStellarAddress}
              toSolanaAddress={parsedConfig.recipientSolanaAddress}
              intent="Deposit"
              onPaymentStarted={printEvent}
              onPaymentCompleted={(e) => {
                printEvent(e);
                setTxHash(e.txHash);
              }}
              showProcessingPayout
            />
            {txHash && (
              <TextLink
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                className="text-primary-medium hover:text-primary-dark"
              >
                Transaction Successful ↗
              </TextLink>
            )}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-medium transition-all"
            >
              Configure Deposit
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="bg-primary-dark text-white px-6 py-3 rounded-lg hover:bg-primary-medium transition-all"
          >
            Create a Deposit
          </button>
        )}

        {/* Only show implementation code if we have a complete config */}
        {Boolean(hasValidConfig) && parsedConfig && (
          <div className="w-full">
            <Text className="text-lg font-medium text-primary-dark mb-2">
              Implementation Code
            </Text>
            <CodeSnippet codeSnippet={codeSnippet} />
          </div>
        )}

        <ConfigPanel
          configType="deposit"
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfirm={handleSetConfig}
          defaultRecipientAddress={config.recipientAddress}
        />

        {parsedConfig?.recipientStellarAddress && (
          <div className="text-sm text-gray-600 text-left">
            <p className="mb-2">
              <strong>Note:</strong> When using <code>toStellarAddress</code>,
              you must set:
            </p>
            <ul className="list-disc list-inside mb-2">
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
        )}
      </div>
    </Container>
  );
}
