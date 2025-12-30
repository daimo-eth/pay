# Basic Payment Example

Accept a fixed-amount payment from any token on any chain.

## Overview

This is the simplest Daimo Pay integration. Users can pay with 1000+ tokens across multiple chains, and you receive a specific token on your chosen chain.

## Usage

```tsx
import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { getAddress } from "viem";

<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xYourAddress..."
  toUnits="10" // 10 USDC
  onPaymentCompleted={(event) => {
    console.log("Received payment:", event.txHash);
  }}
/>
```

## Key Concepts

### Fixed Amount
The `toUnits` prop specifies exactly how much you'll receive. Users see this amount and can pay with any token—Daimo handles the conversion.

### Token Selection
Use `@daimo/pay-common` for convenient token constants:
- `baseUSDC`, `optimismUSDC`, `arbitrumUSDC` - USDC on various chains
- `baseETH`, `arbitrumETH` - Native ETH
- Use `zeroAddress` from viem for native tokens

### Event Handlers
- `onPaymentStarted` - User has submitted payment, funds are in transit
- `onPaymentCompleted` - Funds have arrived at your address
- `onPaymentBounced` - Contract call failed, funds refunded

## When to Use

- One-time purchases
- Subscription payments
- Donations with fixed tiers
- Service fees
