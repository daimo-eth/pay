# Contract Call Example

Execute smart contract calls from any token on any chain.

## Overview

Daimo Pay can execute arbitrary contract calls as part of a payment. This enables seamless UX for NFT mints, DeFi interactions, prediction markets, and more—users pay with any token they have.

## Usage

```tsx
import { DaimoPayButton } from "@daimo/pay";
import { arbitrum } from "@daimo/pay-common";
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";

const nftAbi = parseAbi(["function mint(address to) external payable"]);

<DaimoPayButton
  appId="your-app-id"
  toChain={arbitrum.chainId}
  toToken={zeroAddress} // Pay with ETH
  toAddress="0xNFTContractAddress"
  toUnits="0.01" // 0.01 ETH mint price
  toCallData={encodeFunctionData({
    abi: nftAbi,
    functionName: "mint",
    args: [userAddress],
  })}
  intent="Mint"
  onPaymentCompleted={(event) => {
    console.log("NFT minted! Tx:", event.txHash);
  }}
  onPaymentBounced={(event) => {
    // Contract call reverted, funds refunded
    console.log("Mint failed, refunded to:", event.payment.destination.refundAddress);
  }}
/>
```

## Key Concepts

### Call Data Encoding

Use viem's `encodeFunctionData` to encode the contract call:

```tsx
import { encodeFunctionData, parseAbi } from "viem";

const callData = encodeFunctionData({
  abi: parseAbi(["function myFunction(uint256 amount) external"]),
  functionName: "myFunction",
  args: [1000n],
});
```

### Native Token (ETH) Payments

Use `zeroAddress` from viem as the `toToken` for ETH payments:

```tsx
import { zeroAddress } from "viem";

<DaimoPayButton
  toToken={zeroAddress}
  toUnits="0.1" // 0.1 ETH
  // ...
/>
```

### Handling Reverts

If your contract call reverts, Daimo Pay automatically refunds the user:
- Funds go to `refundAddress` (defaults to the payer)
- `onPaymentBounced` fires instead of `onPaymentCompleted`
- The refund happens on the destination chain

### Refund Address

Specify where funds go if the call fails:

```tsx
<DaimoPayButton
  refundAddress="0xCustomRefundAddress"
  // ...
/>
```

## Examples

### NFT Mint

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={8453} // Base
  toToken={zeroAddress}
  toAddress="0xNFTContract"
  toUnits="0.05"
  toCallData={encodeFunctionData({
    abi: parseAbi(["function mint(address to, uint256 tokenId) external payable"]),
    functionName: "mint",
    args: [userAddress, 1n],
  })}
  intent="Mint NFT"
/>
```

### Prediction Market Bet

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={42161} // Arbitrum
  toToken="0xUSDCAddress"
  toAddress="0xPredictionMarket"
  toUnits="100"
  toCallData={encodeFunctionData({
    abi: parseAbi(["function placeBet(uint256 marketId, bool outcome, uint256 amount) external"]),
    functionName: "placeBet",
    args: [marketId, true, parseUnits("100", 6)],
  })}
  intent="Place Bet"
/>
```

### DeFi Deposit

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={8453}
  toToken="0xUSDCAddress"
  toAddress="0xVaultContract"
  toUnits="1000"
  toCallData={encodeFunctionData({
    abi: parseAbi(["function deposit(uint256 amount, address receiver) external"]),
    functionName: "deposit",
    args: [parseUnits("1000", 6), userAddress],
  })}
  intent="Deposit to Vault"
/>
```

## When to Use

- NFT mints
- Prediction market bets
- DeFi deposits/swaps
- Game item purchases
- Any on-chain action requiring payment
