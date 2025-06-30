"use client";

import { RozoPayButton } from "@rozoai/intent-pay";
import {
  arbitrum,
  getChainExplorerByChainId,
  PaymentCompletedEvent,
  PaymentStartedEvent,
} from "@rozoai/intent-common";
import { useState } from "react";
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import { APP_ID, Columns, Container, printEvent } from "../shared";

export default function DemoContract() {
  const counterAddr = "0x7f3c168DD11379748EeF71Bea70371eBA3327Ca5";
  const counterAbi = parseAbi([
    "function increment(string) external payable",
    "function counter() external view returns (uint256)",
  ]);

  // Load count from chain
  const {
    data: count,
    error,
    refetch,
  } = useReadContract({
    chainId: arbitrum.chainId,
    abi: counterAbi,
    address: counterAddr,
    functionName: "counter",
  });

  // Show transaction, once we're done
  const [successUrl, setSuccessUrl] = useState<string>();

  // Reload on successful action
  const onStart = (e: PaymentStartedEvent) => {
    printEvent(e);
    setSuccessUrl(undefined);
  };
  const onSuccess = (e: PaymentCompletedEvent) => {
    printEvent(e);
    setSuccessUrl(`${getChainExplorerByChainId(e.chainId)}/tx/${e.txHash}`);
    refetch();
  };

  return (
    <Container>
      <Text>
        Rozo Pay enables arbitrary contract calls from any coin on any chain,
        allowing seamless payments for digital goods and user onboarding.
      </Text>
      <Text>
        Example: A user is onboarding to a prediction market. Rozo Pay enables
        the user to place a prediction market bet instantly during onboarding,
        using any tokens they already own.
      </Text>
      <Text>
        Demo: pay 0.0001 ETH to increment{" "}
        <TextLink
          href={`https://arbiscan.io/address/${counterAddr}#code`}
          target="_blank"
        >
          this counter
        </TextLink>
        .
      </Text>
      <div />
      <Columns>
        <div className="flex-1">
          <RozoPayButton
            appId={APP_ID}
            toChain={arbitrum.chainId}
            toAddress={counterAddr}
            toToken={zeroAddress} /* Zero address = ETH */
            toUnits="0.0001" /* 0.0001 ETH */
            toCallData={encodeFunctionData({
              abi: counterAbi,
              functionName: "increment",
              args: ["0x"],
            })}
            intent="Increment"
            onPaymentStarted={onStart}
            onPaymentCompleted={onSuccess}
            onPaymentBounced={printEvent}
          />
        </div>
        <div className="flex-1">
          <Text>Count {count != null && Number(count)}</Text>
        </div>
      </Columns>
      <Columns>
        <div className="flex-1">
          <Text>
            <TextLink
              href="https://github.com/RozoAI/intent-pay/blob/master/examples/nextjs-app/src/app/contract"
              target="_blank"
            >
              View on Github ↗
            </TextLink>
          </Text>
        </div>
        <div className="flex-1">
          {error && <Text>{error.message}</Text>}
          {successUrl && (
            <Text>
              <TextLink href={successUrl} target="_blank">
                View transaction
              </TextLink>
            </Text>
          )}
        </div>
      </Columns>
    </Container>
  );
}
