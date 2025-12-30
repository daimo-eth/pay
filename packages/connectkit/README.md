<a href="https://paydocs.daimo.com">
  <img src="https://pbs.twimg.com/profile_banners/1666972322828541954/1733698695/1500x500">
</a>

# Daimo Pay

Daimo Pay enables seamless crypto payments for your app.

Onboard users from any chain, any coin into your app with one click and maximize your conversion.

## Features

- 🌱 **Instant cross-chain payments** — Accept payment from 1000+ tokens on multiple chains. Payments complete in less than 5 seconds. We handle the swapping and bridging so that your customers don't have to.
- 💡 **Pay with a single transaction** — No more wallet round-trips to make approval, swap, or bridging transactions. Your customers pay with a single transfer transaction.
- ⚡️ **Fully permissionless** — Daimo never custodies funds and funds can never be stuck in a contract. Payments can be permissionlessly completed by anyone.
- 💱 **Support for all major wallets and exchanges** — Daimo Pay supports payments from browser wallets like MetaMask and Rabby, as well as exchanges like Coinbase and Binance.
- 💨 **Integrate within minutes** — Get up and running with Daimo Pay in as little as 10 minutes with little to no code.

## Documentation

Full documentation is available at [paydocs.daimo.com](https://paydocs.daimo.com).

## Quick Start

### Installation

```sh
npm install @daimo/pay @daimo/pay-common wagmi viem @tanstack/react-query
```

### Setup

Wrap your app with the required providers:

```tsx
import { DaimoPayProvider, getDefaultConfig } from "@daimo/pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";

const config = createConfig(
  getDefaultConfig({
    appName: "My App",
    appIcon: "https://myapp.com/icon.png", // optional
  })
);

const queryClient = new QueryClient();

function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider>{children}</DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Basic Usage

Accept a payment of 10 USDC on Base:

```tsx
import { DaimoPayButton } from "@daimo/pay";
import { baseUSDC } from "@daimo/pay-common";
import { getAddress } from "viem";

function PaymentButton() {
  return (
    <DaimoPayButton
      appId="your-app-id"
      toChain={baseUSDC.chainId}
      toToken={getAddress(baseUSDC.token)}
      toAddress="0xYourAddress..."
      toUnits="10" // 10 USDC
      onPaymentCompleted={(event) => {
        console.log("Payment completed!", event.txHash);
      }}
    />
  );
}
```

## API Reference

### DaimoPayButton

The main component for accepting payments. Use this to render a pay button that opens the Daimo Pay checkout modal.

#### Payment Props

You can specify payment details either with inline parameters or with a pre-created `payId`:

**Option 1: Inline Parameters**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `appId` | `string` | Yes | Your public app ID from the Daimo Pay dashboard |
| `toChain` | `number` | Yes | Destination chain ID (e.g., `8453` for Base) |
| `toToken` | `Address` | Yes | Destination token address (use `zeroAddress` for native ETH) |
| `toAddress` | `Address` | Yes | Recipient address or contract to call |
| `toUnits` | `string` | No | Amount in token units (e.g., "10" for 10 USDC). Omit to let users choose |
| `toCallData` | `Hex` | No | Calldata for contract calls |
| `intent` | `string` | No | Button label verb (e.g., "Pay", "Deposit", "Purchase") |
| `externalId` | `string` | No | Your correlation ID for tracking payments |
| `metadata` | `object` | No | Custom key-value metadata (max 50 pairs) |
| `refundAddress` | `Address` | No | Address for refunds if payment bounces |

**Option 2: Pre-created Payment**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `payId` | `string` | Yes | Payment ID from the Daimo Pay API |

#### Payment Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `paymentOptions` | `string[]` | All | Filter available payment methods. Options: `"AllWallets"`, `"Coinbase"`, `"Binance"`, `"MetaMask"`, `"Trust"`, etc. |
| `preferredChains` | `number[]` | - | Chain IDs to prioritize in the token list |
| `preferredTokens` | `{chain, address}[]` | - | Tokens to prioritize in the token list |
| `evmChains` | `number[]` | All | Restrict payments to specific EVM chains |
| `passthroughTokens` | `{chain, address}[]` | - | Tokens sent directly without swapping |
| `prioritizedWalletId` | `string` | - | Wallet connector ID to show first |

#### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onPaymentStarted` | `(event) => void` | Called when user submits payment transaction |
| `onPaymentCompleted` | `(event) => void` | Called when destination transfer/call succeeds |
| `onPaymentBounced` | `(event) => void` | Called when destination call reverts (funds refunded) |
| `onOpen` | `() => void` | Called when modal opens |
| `onClose` | `() => void` | Called when modal closes |

#### Modal Behavior

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultOpen` | `boolean` | `false` | Open modal on mount |
| `closeOnSuccess` | `boolean` | `false` | Auto-close after successful payment |
| `resetOnSuccess` | `boolean` | `false` | Reset payment state after success |
| `connectedWalletOnly` | `boolean` | `false` | Skip method selection, use connected wallet |
| `confirmationMessage` | `string` | - | Custom message on confirmation page |
| `redirectReturnUrl` | `string` | - | Return URL for external payment flows |

#### Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `Theme` | `"auto"` | Named theme: `"auto"`, `"web95"`, `"retro"`, `"soft"`, `"midnight"`, `"minimal"`, `"rounded"`, `"nouns"` |
| `mode` | `Mode` | `"auto"` | Color mode: `"light"`, `"dark"`, `"auto"` |
| `customTheme` | `object` | - | Custom theme overrides |
| `disabled` | `boolean` | `false` | Disable button interaction |

### DaimoPayButton.Custom

Render a custom button with full control over styling:

```tsx
<DaimoPayButton.Custom
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0x..."
  toUnits="10"
>
  {({ show, hide }) => (
    <button onClick={show}>
      Pay with Crypto
    </button>
  )}
</DaimoPayButton.Custom>
```

### DaimoPayProvider

Provides context for all Daimo Pay components. Must wrap your app.

```tsx
<DaimoPayProvider
  theme="auto"              // Named theme
  mode="auto"               // light/dark/auto
  customTheme={{}}          // Custom theme overrides
  debugMode={false}         // Enable debug logging
  solanaRpcUrl="..."        // Custom Solana RPC (optional)
  payApiUrl="..."           // Custom API URL (optional, for testing)
  options={{
    language: "en-US",      // UI language
    hideBalance: false,     // Hide wallet balances
    hideTooltips: false,    // Hide tooltips
    reducedMotion: false,   // Reduce animations
    overlayBlur: 4,         // Modal backdrop blur
  }}
>
  {children}
</DaimoPayProvider>
```

### Hooks

#### useDaimoPay

Main hook for programmatic payment management:

```tsx
import { useDaimoPay } from "@daimo/pay";

function MyComponent() {
  const {
    // State
    order,              // Current order object
    paymentState,       // "idle" | "preview" | "payment_unpaid" | "payment_started" | "payment_completed" | "payment_bounced" | "error"
    paymentErrorMessage,
    paymentWarningMessage,

    // Actions
    createPreviewOrder, // Create a new payment preview
    setPayId,           // Load existing payment by ID
    hydrateOrder,       // Lock in payment details
    payEthSource,       // Register Ethereum payment
    paySolanaSource,    // Register Solana payment
    reset,              // Reset payment state
    setWarning,         // Show warning message
    dismissWarning,     // Dismiss warning
  } = useDaimoPay();

  // Create a payment programmatically
  const startPayment = async () => {
    await createPreviewOrder({
      appId: "your-app-id",
      toChain: 8453,
      toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      toAddress: "0x...",
      toUnits: "10",
    });
  };
}
```

#### useDaimoPayStatus

Get the current payment status:

```tsx
import { useDaimoPayStatus } from "@daimo/pay";

function StatusDisplay() {
  const status = useDaimoPayStatus();

  if (!status) return <p>No active payment</p>;

  return (
    <p>
      Payment {status.paymentId}: {status.status}
    </p>
  );
}
```

#### useDaimoPayUI

Control the payment UI:

```tsx
import { useDaimoPayUI } from "@daimo/pay";

function MyComponent() {
  const { resetPayment } = useDaimoPayUI();

  // Reset and start a new payment with different params
  const changePayment = () => {
    resetPayment({
      toChain: 8453,
      toAddress: "0x...",
      toUnits: "20",
    });
  };
}
```

## Payment Event Types

All event handlers receive typed event objects:

```tsx
type PaymentStartedEvent = {
  type: "payment_started";
  paymentId: string;
  chainId: number;
  txHash: string | null;
  payment: DaimoPayOrderView;
};

type PaymentCompletedEvent = {
  type: "payment_completed";
  paymentId: string;
  chainId: number;
  txHash: string;
  payment: DaimoPayOrderView;
};

type PaymentBouncedEvent = {
  type: "payment_bounced";
  paymentId: string;
  chainId: number;
  txHash: string;
  payment: DaimoPayOrderView;
};
```

## Common Use Cases

### Accept a Fixed Payment

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xYourAddress"
  toUnits="25" // Fixed $25 USDC payment
  intent="Purchase"
  onPaymentCompleted={(e) => {
    // Fulfill the order
    fulfillOrder(e.paymentId);
  }}
/>
```

### User-Selected Deposit Amount

Omit `toUnits` to let users choose how much to deposit:

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xUserWallet"
  intent="Deposit"
/>
```

### Contract Call with Payment

```tsx
import { encodeFunctionData, parseAbi, zeroAddress } from "viem";
import { arbitrum } from "@daimo/pay-common";

const abi = parseAbi(["function mint(address to) external payable"]);

<DaimoPayButton
  appId="your-app-id"
  toChain={arbitrum.chainId}
  toToken={zeroAddress} // Pay with ETH
  toAddress="0xContractAddress"
  toUnits="0.01" // 0.01 ETH mint price
  toCallData={encodeFunctionData({
    abi,
    functionName: "mint",
    args: ["0xUserAddress"],
  })}
  intent="Mint"
/>;
```

### Track Payments with External ID

```tsx
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xYourAddress"
  toUnits="100"
  externalId={orderId} // Your order/cart ID
  metadata={{
    userId: "user123",
    productId: "prod456",
  }}
  onPaymentStarted={(e) => {
    // Save paymentId to your backend
    savePayment(e.paymentId, orderId);
  }}
/>
```

### Restrict Payment Methods

```tsx
// Only allow Coinbase and browser wallets
<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xYourAddress"
  toUnits="50"
  paymentOptions={["AllWallets", "Coinbase"]}
/>
```

### Prioritize Specific Tokens

```tsx
import { baseUSDC, optimismUSDC } from "@daimo/pay-common";

<DaimoPayButton
  appId="your-app-id"
  toChain={baseUSDC.chainId}
  toToken={getAddress(baseUSDC.token)}
  toAddress="0xYourAddress"
  toUnits="100"
  preferredChains={[baseUSDC.chainId, optimismUSDC.chainId]}
  preferredTokens={[
    { chain: baseUSDC.chainId, address: getAddress(baseUSDC.token) },
    { chain: optimismUSDC.chainId, address: getAddress(optimismUSDC.token) },
  ]}
/>;
```

## Supported Chains

Daimo Pay supports payments from:

- **EVM Chains**: Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Linea, Scroll, Gnosis, Celo, Worldchain
- **Solana**: SOL and SPL tokens
- **Exchanges**: Coinbase, Binance, and more

## Examples

Check out working examples at [github.com/daimo-eth/daimo-pay-demo](https://github.com/daimo-eth/daimo-pay-demo)

### Local Development

Clone the repository and build the SDK in dev mode:

```sh
git clone https://github.com/daimo-eth/pay.git
cd pay/packages/connectkit
npm i
npm run dev
```

The rollup bundler will watch file changes. Test with an example app:

```sh
cd examples/nextjs-app
npm i
npm run dev
```

## Contracts

Daimo Pay is noncustodial and runs on open-source, audited contracts. See `/packages/contract`.

**Audits:**

- [Nethermind, 2025 Aug](https://github.com/user-attachments/files/22227674/NM-0585-Daimo.pdf)
- [Nethermind, 2025 Apr](https://github.com/user-attachments/files/20544714/NM-0500-Daimo-Pay-final-report.pdf)

## Support

[Contact us](mailto:support@daimo.com) if you'd like to integrate Daimo Pay.

## License

See [LICENSE](https://github.com/daimo-eth/pay/blob/master/packages/connectkit/LICENSE) for more information.

## Credits

Daimo Pay SDK uses a fork of [ConnectKit](https://github.com/family/connectkit), developed by [Family](https://family.co). We're grateful to them for making ConnectKit open-source.
