"use client";

import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { sdk } from "@farcaster/frame-sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import { APP_ID, Container, DAIMO_ADDRESS } from "../shared";

export default function DemoFarcasterFrame() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  (globalThis as any).__POWEREDBY__ = "JUST_TEST";
  (globalThis as any).__SUPPORTURL__ = "https://www.google.com";
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  if (!isSDKLoaded) {
    return <Text className="mt-4">Loading Frame SDK...</Text>;
  }

  return (
    <Container>
      <Text>
        Daimo Pay can be used to build mini apps that work in Farcaster, World
        (& more coming soon). Ship your app with great UX and built-in social
        distribution.
      </Text>
      <Text className="mt-4">
        Try this demo as a Farcaster mini app using the developer portal.
      </Text>
      <Text>
        <Link
          href="https://warpcast.com/~/developers/mini-apps/preview?url=https%3A%2F%2Fdaimo-pay-demo.vercel.app%2Fmini-app"
          target="_blank"
          className="underline"
        >
          Open developer portal
        </Link>{" "}
      </Text>
      <div />
      <DaimoPayButton
        appId={APP_ID}
        toChain={baseUSDC.chainId}
        toAddress={DAIMO_ADDRESS}
        toUnits="0.12" /* $0.12 USDC */
        toToken={getAddress(baseUSDC.token)}
      />
      <Text>
        <TextLink
          href="https://github.com/daimo-eth/pay/blob/master/examples/nextjs-app/src/app/mini-app"
          target="_blank"
        >
          View on Github ↗
        </TextLink>
      </Text>
    </Container>
  );
}
