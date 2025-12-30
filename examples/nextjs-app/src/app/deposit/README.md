# Deposit Example

Let users deposit any amount they choose into your app.

## Overview

This pattern is ideal for user onboarding. Users can deposit funds using any token they own, and receive a specific token in their account within your app.

## Usage

```tsx
import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { getAddress } from "viem";

<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress={userWalletAddress} // User's address in your app
  intent="Deposit"
  // Note: toUnits is omitted - user chooses the amount
  onPaymentCompleted={(event) => {
    // Credit user's account
    const amount = event.payment.destination.amountUnits;
    creditUserAccount(userId, amount);
  }}
/>
```

## Key Concepts

### User-Selected Amount

Omitting `toUnits` enables the deposit flow:
- Users see an amount input field
- They can deposit as much as they want
- Minimum and maximum limits are handled automatically

### Intent Label

Set `intent="Deposit"` to change the button text and UI copy to match the deposit context.

### Crediting User Accounts

In `onPaymentCompleted`, access the deposited amount via:
```tsx
event.payment.destination.amountUnits // e.g., "100.00" for 100 USDC
```

## Common Patterns

### Onboarding New Users

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress={newUserAddress}
  intent="Get Started"
  confirmationMessage="Welcome! Your deposit is being processed."
/>
```

### Wallet Top-Up

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress={userAddress}
  intent="Add Funds"
/>
```

## When to Use

- User onboarding flows
- In-app wallet top-ups
- Savings or investment deposits
- Gaming credits
- Any scenario where users choose the amount
