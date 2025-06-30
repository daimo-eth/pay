"use client";

import { RozoPayButton } from "@rozoai/intent-pay";
import { baseUSDC } from "@rozoai/intent-common";
import { sdk } from "@farcaster/frame-sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import { APP_ID, Container, ROZO_ADDRESS } from "../shared";

export default function DemoFarcasterFrame() {
  const url = typeof window !== "undefined" ? window.location.href : "";
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
        Rozo Pay can be used to build mini apps that work in Farcaster, World
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
      <RozoPayButton
        appId={APP_ID}
        toChain={baseUSDC.chainId}
        toAddress={ROZO_ADDRESS}
        toUnits="0.12" /* $0.12 USDC */
        toToken={getAddress(baseUSDC.token)}
      />
      <Text>
        <TextLink
          href="https://github.com/RozoAI/intent-pay/blob/master/examples/nextjs-app/src/app/mini-app"
          target="_blank"
        >
          View on Github ↗
        </TextLink>
      </Text>
    </Container>
  );
}
