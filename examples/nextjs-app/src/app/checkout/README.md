# Checkout Payment Example

Best practices for e-commerce checkout with robust payment tracking.

## Overview

This example shows how to integrate Daimo Pay in a checkout flow where you need to reliably correlate payments with orders, carts, or user sessions.

## Usage

```tsx
import { DaimoPayButton, PaymentStartedEvent } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { getAddress } from "viem";

function CheckoutButton({ orderId }: { orderId: string }) {
  const handlePaymentStarted = async (event: PaymentStartedEvent) => {
    // IMPORTANT: Save paymentId immediately to correlate with your order
    await savePaymentToBackend({
      orderId,
      paymentId: event.paymentId,
      status: "started",
    });
  };

  return (
    <DaimoPayButton
      appId="your-app-id"
      toChain={baseUSDC.chainId}
      toToken={getAddress(baseUSDC.token)}
      toAddress="0xYourMerchantAddress"
      toUnits="42.00"
      intent="Purchase"
      externalId={orderId}
      metadata={{
        orderId,
        customerId: "cust_123",
      }}
      preferredChains={[baseUSDC.chainId]}
      preferredTokens={[
        { chain: baseUSDC.chainId, address: getAddress(baseUSDC.token) },
      ]}
      onPaymentStarted={handlePaymentStarted}
      onPaymentCompleted={(event) => {
        // Fulfill the order
        fulfillOrder(orderId);
      }}
    />
  );
}
```

## Key Concepts

### Payment Correlation

Always save `paymentId` in `onPaymentStarted`:
- This ensures you can track payments even if the user closes their browser
- Use `externalId` to pass your own order/cart identifier
- The `metadata` object lets you attach any custom data

### Webhooks

For production, use [webhooks](https://paydocs.daimo.com/webhooks) instead of relying solely on frontend callbacks:
- Webhooks fire even if the user's browser is closed
- More reliable for order fulfillment
- Supports `payment_started`, `payment_completed`, and `payment_bounced` events

### Token Prioritization

Use `preferredChains` and `preferredTokens` to show your preferred payment options first:
- Tokens the user owns on preferred chains appear at the top
- Reduces friction for users who already have the right tokens

## When to Use

- E-commerce checkout
- Subscription billing
- Any flow where payment must be correlated with an action
