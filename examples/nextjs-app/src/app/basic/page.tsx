"use client";

import { DaimoPayButton } from "@daimo/pay";
import * as payCommon from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text } from "../../shared/tailwind-catalyst/text";
import CodeSnippet from "../code-snippet";
import { ConfigPanel, type PaymentConfig } from "../config-panel";
import { APP_ID, Container, printEvent } from "../shared";

export default function DemoBasic() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
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
    if (config == null) return;

    const token = Object.values(payCommon).find(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        "token" in t &&
        t.token === config.tokenAddress,
    );

    if (!(token && typeof token === "object" && "symbol" in token)) return;

    const tokenVarName =
      Object.entries(payCommon).find(
        ([_, value]) =>
          typeof value === "object" &&
          value !== null &&
          "token" in value &&
          value.token === config.tokenAddress,
      )?.[0] || token.symbol;

    const snippet = `
import { ${tokenVarName} } from "@daimo/pay-common";

<DaimoPayButton
  appId="${APP_ID}"
  toChain={${tokenVarName}.chainId}
  toAddress={getAddress("${config.recipientAddress}")}
  toUnits={"${config.amount}"}
  toToken={getAddress(${tokenVarName}.token)}
/>
        `;
    setCodeSnippet(snippet);
  }, [config]);

  return (
    <Container className="max-w-4xl mx-auto p-6">
      <Text className="text-lg text-gray-700 mb-4">
        This demo shows how you can accept a basic payment from any coin on any
        chain. Configure the recipient to make a payment to yourself.
      </Text>

      <div className="flex flex-col items-center gap-8">
        {config ? (
          <>
            <DaimoPayButton
              appId={APP_ID}
              toChain={config.chainId}
              toAddress={getAddress(config.recipientAddress)}
              toUnits={config.amount}
              toToken={getAddress(config.tokenAddress)}
              onPaymentStarted={printEvent}
              onPaymentCompleted={printEvent}
              paymentOptions={["EVM"]}
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

        {config && (
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
          onConfirm={(paymentConfig) =>
            setConfig(paymentConfig as PaymentConfig)
          }
        />
      </div>
    </Container>
  );
}
