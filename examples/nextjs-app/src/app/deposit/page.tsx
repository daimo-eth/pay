"use client";

import { DaimoPayButton } from "@daimo/pay";
import * as foreignTokens from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel, type DepositConfig } from "../config-panel";
import { APP_ID, Container, printEvent, usePersistedConfig } from "../shared";
import { ClipboardIcon } from "@heroicons/react/24/outline";

export default function DemoDeposit() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = usePersistedConfig("daimo-deposit-config", {
    recipientAddress: "",
    chainId: 0,
    tokenAddress: "",
  });
  const [codeSnippet, setCodeSnippet] = useState("");

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
    // Only generate code snippet if we have a complete config
    if (
      !config?.recipientAddress ||
      !config?.chainId ||
      !config?.tokenAddress
    ) {
      setCodeSnippet("");
      return;
    }

    const token = Object.values(foreignTokens).find(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        "token" in t &&
        t.token === config.tokenAddress,
    );

    if (!(token && typeof token === "object" && "symbol" in token)) return;

    const tokenVarName =
      Object.entries(foreignTokens).find(
        ([_, value]) =>
          typeof value === "object" &&
          value !== null &&
          "token" in value &&
          value.token === config.tokenAddress,
      )?.[0] || token.symbol;

    const snippet = `import { ${tokenVarName} } from "@daimo/pay-common";

<DaimoPayButton
  appId="${APP_ID}"
  toChain={${tokenVarName}.chainId}
  toAddress={getAddress("${config.recipientAddress}")}
  toToken={getAddress(${tokenVarName}.token)}
  intent="Deposit"
/>`;
    setCodeSnippet(snippet);
  }, [config]);

  // Only render the DaimoPayButton when we have valid config
  const hasValidConfig =
    config && config.recipientAddress && config.chainId && config.tokenAddress;

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        Onboard users to your app using the tokens they already own on other
        chains. Users can customize their deposit amount.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {hasValidConfig ? (
          <>
            <DaimoPayButton
              appId={APP_ID}
              toChain={config.chainId}
              toAddress={getAddress(config.recipientAddress)}
              toToken={getAddress(config.tokenAddress)}
              intent="Deposit"
              onPaymentStarted={printEvent}
              onPaymentCompleted={(e) => {
                printEvent(e);
                setTxHash(e.txHash);
              }}
            />
            {txHash && (
              <TextLink
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                className="text-green-medium hover:text-green-dark"
              >
                Transaction Successful ↗
              </TextLink>
            )}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="bg-green-dark text-white px-6 py-3 rounded-lg hover:bg-green-medium transition-all"
            >
              Configure Deposit
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfigOpen(true)}
            className="bg-green-dark text-white px-6 py-3 rounded-lg hover:bg-green-medium transition-all"
          >
            Create a Deposit
          </button>
        )}

        {/* Only show implementation code if we have a complete config */}
        {config?.recipientAddress &&
          config?.chainId &&
          config?.tokenAddress && (
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <Text className="text-lg font-medium text-green-dark">
                  Implementation Code
                </Text>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet);
                    // Optional: Add toast/feedback here
                  }}
                  className="p-2 text-gray-500 hover:text-green-dark transition-colors rounded-lg hover:bg-gray-100"
                  title="Copy code"
                >
                  <ClipboardIcon className="h-5 w-5" />
                </button>
              </div>
              <CodeSnippet codeSnippet={codeSnippet} />
            </div>
          )}

        <ConfigPanel
          configType="deposit"
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfirm={setConfig}
          defaultRecipientAddress={config.recipientAddress}
        />
      </div>
    </Container>
  );
}
