# Daimo Pay Next.js Examples

Interactive examples demonstrating various Daimo Pay integration patterns.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```sh
npm install
```

### Running Locally

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the examples.

## Examples

### 1. Basic Payment (`/basic`)

The simplest integration: accept a fixed payment to a specific address.

**Use Case:** Selling a product or service for a fixed price.

**Key Props:**
- `toChain` - Destination chain ID
- `toToken` - Token to receive
- `toAddress` - Your receiving address
- `toUnits` - Fixed payment amount

### 2. Checkout (`/checkout`)

Best practices for e-commerce checkout integration with payment tracking.

**Use Case:** Cart checkout where you need to correlate payments with orders.

**Key Features:**
- Save `paymentId` in `onPaymentStarted` to correlate with your backend
- Use `preferredChains` and `preferredTokens` to prioritize certain tokens
- Integrate with [webhooks](https://paydocs.daimo.com/webhooks) for reliable backend tracking

### 3. Deposit (`/deposit`)

Let users deposit any amount they choose to your app.

**Use Case:** User onboarding, wallet top-ups, savings deposits.

**Key Difference:** Omit `toUnits` to let users select their deposit amount.

### 4. Contract Call (`/contract`)

Execute arbitrary smart contract calls paid with any token.

**Use Case:** NFT mints, prediction markets, DeFi interactions during onboarding.

**Key Props:**
- `toCallData` - Encoded function call data
- `toToken` - Use `zeroAddress` for ETH payments

### 5. Mini App (`/mini-app`)

Integration within Farcaster Frames (v2).

**Use Case:** In-feed payments within Farcaster.

## Project Structure

```
src/
├── app/
│   ├── basic/          # Basic payment example
│   ├── checkout/       # E-commerce checkout example
│   ├── contract/       # Contract call example
│   ├── deposit/        # User deposit example
│   └── mini-app/       # Farcaster frame example
├── shared/             # Shared UI components
└── styles/             # Global styles
```

## Configuration

Create a `.env.local` file with your configuration:

```
NEXT_PUBLIC_APP_ID=your-daimo-pay-app-id
```

## Learn More

- [Daimo Pay Documentation](https://paydocs.daimo.com)
- [SDK Reference](https://paydocs.daimo.com/sdk)
- [Webhooks Guide](https://paydocs.daimo.com/webhooks)
- [API Reference](https://paydocs.daimo.com/payments-api)
