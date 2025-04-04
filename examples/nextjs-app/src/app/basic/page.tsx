"use client";

import { DaimoPayButton } from "@daimo/pay";
import * as payCommon from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel, type PaymentConfig } from "../config-panel";
import { APP_ID, Container, printEvent, usePersistedConfig } from "../shared";
import { ClipboardIcon } from "@heroicons/react/24/outline";

export default function DemoBasic() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = usePersistedConfig("daimo-basic-config", {
    recipientAddress: "",
    chainId: 0,
    tokenAddress: "",
    amount: "",
  });
  const [codeSnippet, setCodeSnippet] = useState("");

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
    if (
      !config?.recipientAddress ||
      !config?.chainId ||
      !config?.tokenAddress ||
      !config?.amount
    ) {
      setCodeSnippet("");
      return;
    }

    // Get the correct native token variable name for the chain
    const nativeTokenMap = {
      42161: "arbitrumETH", // Arbitrum
      8453: "baseETH", // Base
      81457: "blastETH", // Blast
      56: "bscBNB", // BSC
      1: "ethereumETH", // Ethereum
      59144: "lineaETH", // Linea
      5000: "mantleMNT", // Mantle
      10: "optimismETH", // Optimism
      137: "polygonPOL", // Polygon
      11155111: "worldchainETH", // Worldchain
    };

    const tokenVarName = nativeTokenMap[config.chainId] || "arbitrumETH"; // fallback

    const snippet = `import { ${tokenVarName} } from "@daimo/pay-common";

<DaimoPayButton
  appId="${APP_ID}"
  toChain={${tokenVarName}.chainId}
  toAddress={getAddress("${config.recipientAddress}")}
  toUnits={"${config.amount}"}
  toToken={getAddress(${tokenVarName}.token)}
/>`;
    setCodeSnippet(snippet);
  }, [config]);

  // Only render the DaimoPayButton when we have valid config
  const hasValidConfig =
    config &&
    config.recipientAddress &&
    config.chainId &&
    config.tokenAddress &&
    config.amount;

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        This demo shows how you can accept a basic payment from any coin on any
        chain. Configure the recipient to make a payment to yourself.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {hasValidConfig ? (
          <>
            <DaimoPayButton
              appId={APP_ID}
              toChain={config.chainId}
              toAddress={getAddress(config.recipientAddress)}
              toUnits={config.amount}
              toToken={getAddress(config.tokenAddress)}
              onPaymentStarted={printEvent}
              onPaymentCompleted={printEvent}
            />
            <button
              onClick={() => setIsConfigOpen(true)}
              className="bg-green-dark text-white px-6 py-3 rounded-lg hover:bg-green-medium transition-all"
            >
              Configure Payment
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="bg-green-dark text-white px-6 py-3 rounded-lg hover:bg-green-medium transition-all"
          >
            Create a Payment
          </button>
        )}

        {/* Only show implementation code if we have a complete config */}
        {config?.recipientAddress &&
          config?.chainId &&
          config?.tokenAddress &&
          config?.amount && (
            <div className="w-full">
              <Text className="text-lg font-medium text-green-dark mb-2">
                Implementation Code
              </Text>
              <CodeSnippet codeSnippet={codeSnippet} />
            </div>
          )}

        <ConfigPanel
          configType="payment"
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfirm={setConfig}
          defaultRecipientAddress={config.recipientAddress}
        />
      </div>
    </Container>
  );
}
