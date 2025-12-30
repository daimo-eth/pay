# Farcaster Mini App Example

Integrate Daimo Pay within Farcaster Frames (v2).

## Overview

Daimo Pay works inside Farcaster Frames, enabling in-feed payments and contract calls. Users can pay with any token without leaving the Farcaster app.

## Prerequisites

Install the Farcaster Frame SDK:

```sh
npm install @farcaster/frame-sdk
```

## Usage

```tsx
import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { getAddress } from "viem";
import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

function FramePayment() {
  // Initialize the Frame SDK
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <DaimoPayButton
      appId="your-app-id"
      toChain={baseUSDC.chainId}
      toToken={getAddress(baseUSDC.token)}
      toAddress="0xYourAddress"
      toUnits="5"
      intent="Tip"
      onPaymentCompleted={(event) => {
        // Optionally close the frame or show success
        console.log("Payment received!");
      }}
    />
  );
}
```

## Testing Your Frame

1. Build and deploy your Frame app
2. Copy your Frame URL (e.g., `https://your-app.vercel.app/mini-app`)
3. Open the [Frame Developer Portal](https://warpcast.com/~/developers/frames)
4. Paste your URL in the "Launch Frame" section
5. Test the payment flow

## Key Considerations

### Frame Context

Farcaster Frames have some limitations:
- External links may not work on all platforms
- Some wallet connectors may not be available
- Always test on actual Farcaster clients

### Payment Options

Consider limiting payment options for better UX in frames:

```tsx
<DaimoPayButton
  paymentOptions={["AllWallets"]}
  // Exclude exchange options that require redirects
  // ...
/>
```

### Mobile Wallet Priority

On mobile, prioritize wallets that work well in-app:

```tsx
<DaimoPayButton
  paymentOptions={[["MetaMask", "Rainbow", "Coinbase Wallet"], "AllWallets"]}
  // Mobile-friendly wallets shown first
  // ...
/>
```

## Example: Tipping Frame

```tsx
function TipFrame({ creatorAddress }: { creatorAddress: string }) {
  return (
    <div className="p-4">
      <h1>Support this creator</h1>
      <DaimoPayButton
        appId="your-app-id"
        toChain={baseUSDC.chainId}
        toToken={getAddress(baseUSDC.token)}
        toAddress={creatorAddress}
        intent="Tip"
        // Let user choose tip amount
        onPaymentCompleted={() => {
          // Show thank you message
        }}
      />
    </div>
  );
}
```

## When to Use

- In-feed tipping
- Frame-based purchases
- Social payments
- Farcaster-native commerce
