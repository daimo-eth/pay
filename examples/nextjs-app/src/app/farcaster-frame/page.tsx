"use client";

import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import sdk from "@farcaster/frame-sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { CopyButton } from "../../shared/copy-button";
import { Text, TextLink } from "../../shared/tailwind-catalyst/text";
import { APP_ID, Container, DAIMO_ADDRESS } from "../shared";

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
        Daimo Pay can be embedded in a Farcaster Framev2. Make contract calls or
        accept payments from any coin on any chain from inside a Farcaster
        Frame.
      </Text>
      <Text>
        You will still need to install the{" "}
        <Link
          href="https://docs.farcaster.xyz/developers/frames/v2/"
          target="_blank"
          className="underline"
        >
          Farcaster Frame SDK
        </Link>{" "}
        to use Daimo Pay in a Frame.
      </Text>
      <Text className="mt-4">Try this demo from inside a Farcaster Frame.</Text>
      <Text>
        1. <CopyButton textToCopy={url} />
      </Text>
      <Text>
        1.{" "}
        <Link
          href="https://warpcast.com/~/developers/frames"
          target="_blank"
          className="underline"
        >
          Open the Frame developer portal
        </Link>{" "}
        and paste the copied URL into the URL field of the &quot;Launch
        Frame&quot; section.
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
          href="https://github.com/daimo-eth/pay/blob/master/examples/nextjs-app/src/app/farcaster-frame"
          target="_blank"
        >
          View on Github ↗
        </TextLink>
      </Text>
    </Container>
  );
}
