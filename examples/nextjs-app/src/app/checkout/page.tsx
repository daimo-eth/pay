"use client";

import { DaimoPayButton } from "@daimo/pay";
import {
  baseUSDC,
  getAddressContraction,
  PaymentStartedEvent,
} from "@daimo/pay-common";
import { useCallback, useState } from "react";
import { getAddress } from "viem";
import {
  APP_ID,
  Columns,
  Container,
  DAIMO_ADDRESS,
  printEvent,
} from "../shared";
import { Code, Text, TextLink } from "../typography";

export default function DemoCheckout() {
  const [payId, setPayId] = useState<string>();

  const start = useCallback((e: PaymentStartedEvent) => {
    printEvent(e);
    const payId = e.paymentId;
    setPayId(payId);
    // Save payId to your backend here. This ensures that you'll be able to
    // correlate all incoming payments even if the user loses network, etc.
    //
    // For example:
    // await saveCartCheckout(payId, ...);
  }, []);

  return (
    <Container>
      <Text>
        For robust checkout, save the payId in <Code>onPaymentStarted</Code>.
        This ensures you&apos;ll be able to correlate incoming payments with a
        cart (or a user ID, form submission, etc) even if the user closes the
        tab.
      </Text>
      <Text>
        In addition to callbacks like <Code>onPaymentSucceeded</Code>, Daimo Pay
        supports{" "}
        <TextLink href="https://paydocs.daimo.com/webhooks">webhooks</TextLink>{" "}
        to track payment status reliably on the backend.
      </Text>
      <div />
      <Columns>
        <div className="flex-1">
          <DaimoPayButton
            appId={APP_ID}
            toChain={baseUSDC.chainId}
            toAddress={DAIMO_ADDRESS}
            toUnits="0.42" /* $0.42 USDC */
            toToken={getAddress(baseUSDC.token)}
            intent="Purchase"
            /* Rank tokens on Base to the top of the payment options. */
            preferredChains={[baseUSDC.chainId]}
            /* Rank USDC on Base above all other tokens. */
            preferredTokens={[
              { chain: baseUSDC.chainId, address: getAddress(baseUSDC.token) },
            ]}
            onPaymentStarted={start}
          />
        </div>
        <div className="flex-1">
          <Text>PayID {payId ? getAddressContraction(payId) : "TBD"}</Text>
        </div>
      </Columns>
      <Text>
        <TextLink
          href="https://github.com/daimo-eth/pay/blob/master/examples/nextjs-app/src/app/checkout"
          target="_blank"
        >
          View on Github ↗
        </TextLink>
      </Text>
    </Container>
  );
}
