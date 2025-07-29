"use client";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import * as Tokens from "@rozoai/intent-common";
import {
  getChainName,
  getChainNativeToken,
  knownTokens,
} from "@rozoai/intent-common";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel } from "../config-panel";
import { APP_ID, Container, printEvent, usePersistedConfig } from "../shared";

type Config = {
  recipientAddress: string;
  recipientStellarAddress?: string;
  chainId: number;
  tokenAddress: string;
  amount: string;
};

export default function DemoBasic() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = usePersistedConfig("rozo-basic-config", {
    recipientAddress: "",
    recipientStellarAddress: "",
    chainId: 0,
    tokenAddress: "",
    amount: "",
  } as Config);
  const [codeSnippet, setCodeSnippet] = useState("");
  const { resetPayment } = useRozoPayUI();

  const handleSetConfig = (config: Config) => {
    setConfig(config);
    resetPayment({
      toChain: config.chainId,
      toAddress: getAddress(config.recipientAddress),
      toStellarAddress: config.recipientStellarAddress,
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

  // Only render the RozoPayButton when we have valid config
  const hasValidConfig =
    config &&
    config.recipientAddress &&
    config.chainId &&
    config.tokenAddress &&
    config.amount;

  useEffect(() => {
    if (!hasValidConfig) {
      setCodeSnippet("");
      return;
    }

    // First check if it's a native token (address is 0x0)
    if (
      config.tokenAddress === Tokens.getChainNativeToken(config.chainId)?.token
    ) {
      const tokenVarName =
        getChainName(config.chainId).toLowerCase() +
        getChainNativeToken(config.chainId)?.symbol;
      if (tokenVarName) {
        const snippet = `import { ${tokenVarName} } from "@rozoai/intent-common";

<RozoPayButton
  appId="${APP_ID}"
  toChain={${tokenVarName}.chainId}
  toAddress={getAddress("${config.recipientAddress}")}
  ${
    config.recipientStellarAddress
      ? `toStellarAddress={"${config.recipientStellarAddress}"}`
      : ""
  }
  toUnits={"${config.amount}"}
  toToken={getAddress(${tokenVarName}.token)}
/>`;
        setCodeSnippet(snippet);
        return;
      }
    }

    // For non-native tokens
    const token = knownTokens.find(
      (t) => t.token === config.tokenAddress && t.chainId === config.chainId
    );
    if (!token) return;

    // Find the variable name in pay-common exports
    const tokenVarName =
      Object.entries(Tokens).find(([_, t]) => t === token)?.[0] || token.symbol;

    const snippet = `import { ${tokenVarName} } from "@rozoai/intent-common";

<RozoPayButton
  appId="${APP_ID}"
  toChain={${tokenVarName}.chainId}
  toAddress={getAddress("${config.recipientAddress}")}
  ${
    config.recipientStellarAddress
      ? `toStellarAddress={"${config.recipientStellarAddress}"}
      toUnits={"${config.amount}"}
  toToken={getAddress(${tokenVarName}.token)}`
      : `toUnits={"${config.amount}"}
  toToken={getAddress(${tokenVarName}.token)}`
  }
/>`;
    setCodeSnippet(snippet);
  }, [config, hasValidConfig]);

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        This demo shows how you can accept a basic payment from any coin on any
        chain. Configure the recipient to make a payment to yourself.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {hasValidConfig ? (
          <>
            <RozoPayButton
              appId={APP_ID}
              toChain={config.chainId}
              toAddress={getAddress(config.recipientAddress)}
              toStellarAddress={config.recipientStellarAddress}
              toUnits={config.amount}
              toToken={getAddress(config.tokenAddress)}
              onPaymentStarted={printEvent}
              onPaymentCompleted={printEvent}
              resetOnSuccess={true}
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
        {hasValidConfig && (
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
      </div>
    </Container>
  );
}
