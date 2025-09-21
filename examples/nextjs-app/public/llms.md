# RozoAI Intent Pay SDK - AI Service Quick Start Guide

> **Cross-chain crypto payments made simple** – Accept payments from any blockchain with a single component

[![npm version](https://badge.fury.io/js/@rozoai%2Fintent-pay.svg)](https://badge.fury.io/js/@rozoai%2Fintent-pay)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)

## Table of Contents

- [What RozoAI Intent Pay Does](#-what-rozoai-intent-pay-does)
- [Requirements Checklist](#-requirements-checklist-mandatory)
- [Complete Working Example](#-complete-working-example-copy--paste-ready)
- [Quick Customization Patterns](#-quick-customization-patterns)
- [Common Mistakes to Avoid](#-common-mistakes-to-avoid)
- [Supported Chains & Tokens](#-supported-chains--tokens)
- [Payment Methods](#-payment-methods-your-users-can-use)
- [Single Prompt Hit to Generate](#-single-prompt-hit-to-generate)
- [Essential API Reference](#-essential-api-reference-ai-services)
- [Testing Checklist](#-testing-checklist)
- [Success Examples](#-success-examples)
- [Additional Resources](#-additional-resources-optional-reading)
- [Advanced Configuration](#advanced-configuration)
- [Production Checklist](#production-checklist)
- [Support & Resources](#-support--resources)
- [Demo Link](#-demo-link)
- [License](#-license)

## 🤖 For AI Services: Single Prompt Implementation

This guide is optimized for AI services to quickly create working examples from a single prompt. All requirements and patterns are clearly defined below.

### 🎯 What RozoAI Intent Pay Does

RozoAI Intent Pay SDK is a React component that lets users pay you in crypto from supported networks — Base, Polygon, Solana, Stellar, and BSC. Your users can pay with their preferred wallet, while you receive exactly what you want.

**Key Benefits:**

- ✅ **One Component** - Add `<RozoPayButton>` and you're done
- ✅ **Supported Chains** - Base, Polygon, Solana, Stellar, BSC
- ✅ **Any Wallet** - MetaMask, Phantom, Coinbase Wallet, and more
- ✅ **Supported Tokens** - USDC on Base/Polygon/Solana/Stellar; USDT on BSC
- ✅ **Mobile Ready** - Works perfectly on mobile apps
- ✅ **Zero Config** - Smart defaults, easy customization

## 📋 REQUIREMENTS CHECKLIST (MANDATORY)

When creating examples, AI services MUST follow these requirements:

### ✅ 1. Provider Structure (REQUIRED)

```tsx
// MUST wrap your app with these providers in this exact order:
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <RozoPayProvider payApiUrl="https://intentapi.rozo.ai" debugMode>
      {/* Your app components here */}
    </RozoPayProvider>
  </QueryClientProvider>
</WagmiProvider>
```

### ✅ 2. Dependencies (REQUIRED)

```json
{
  "dependencies": {
    "@rozoai/intent-pay": "latest",
    "@rozoai/intent-common": "latest",
    "@tanstack/react-query": "^5.51.11",
    "wagmi": "^2.15.6",
    "viem": "^2.31.6",
    "react": "^18.2.0"
  }
}
```

### ✅ 3. Wagmi Config (REQUIRED)

```tsx
import { getDefaultConfig } from "@rozoai/intent-pay";
import { createConfig } from "wagmi";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Your App Name",
  })
);
```

### ✅ 4. QueryClient Setup (REQUIRED)

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
```

### ✅ 5. Required Imports (COPY EXACTLY)

```tsx
// Core SDK imports
import {
  RozoPayProvider,
  RozoPayButton,
  getDefaultConfig,
} from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";
import { getAddress } from "viem";

// Optional: Common tokens and utilities
import { baseUSDC } from "@rozoai/intent-common";
```

## 🚀 COMPLETE WORKING EXAMPLE (COPY & PASTE READY)

Here's a complete, working example that AI services can generate. This follows all requirements:

### 📁 File Structure

```
src/
├── providers.tsx          # Required providers setup
├── App.tsx               # Main app component
└── package.json          # Dependencies
```

### 📄 providers.tsx (REQUIRED)

```tsx
"use client";

import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "RozoAI Payment Demo",
  })
);

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl="https://intentapi.rozo.ai" debugMode>
          {children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 📄 App.tsx (Main Component)

```tsx
"use client";

import { RozoPayButton } from "@rozoai/intent-pay";
import { baseUSDC } from "@rozoai/intent-common";
import { getAddress } from "viem";
import { Providers } from "./providers";

function PaymentDemo() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Crypto Payment Demo</h1>

      <RozoPayButton
        appId="rozoDemoMP" // Demo app ID - replace with yours
        toChain={baseUSDC.chainId} // Base chain (8453)
        toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")} // Your wallet
        toToken={getAddress(baseUSDC.token)} // USDC on Base
        toUnits="5" // $5 USDC
        intent="Pay $5" // Button text
        onPaymentStarted={(event) => {
          console.log("✅ Payment started!", event.paymentId);
          // Handle payment start (e.g., show loading state)
        }}
        onPaymentCompleted={(event) => {
          console.log("🎉 Payment completed!", event.txHash);
          alert("Payment successful! 🎉");
          // Handle successful payment (e.g., fulfill order)
        }}
        onPaymentBounced={(event) => {
          console.log("❌ Payment bounced!", event);
          alert("Payment failed. You'll receive a refund.");
          // Handle failed payment
        }}
      />

      <p className="text-sm text-gray-600 mt-4">
        Users can pay from any supported blockchain and wallet
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <PaymentDemo />
    </Providers>
  );
}
```

### 📄 package.json (Dependencies)

```json
{
  "name": "rozoai-payment-demo",
  "private": true,
  "dependencies": {
    "@rozoai/intent-pay": "latest",
    "@rozoai/intent-common": "latest",
    "@tanstack/react-query": "^5.51.11",
    "wagmi": "^2.15.6",
    "viem": "^2.31.6",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

## 🎯 QUICK CUSTOMIZATION PATTERNS

### Pattern 1: Different Amount

```tsx
<RozoPayButton
  appId="rozoDemoMP"
  toChain={baseUSDC.chainId}
  toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
  toToken={getAddress(baseUSDC.token)}
  toUnits="25" // $25 instead of $5
  intent="Buy Pro Plan"
/>
```

### Pattern 2: Multiple Payment Options

```tsx
<RozoPayButton
  appId="rozoDemoMP"
  toChain={baseUSDC.chainId}
  toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
  toToken={getAddress(baseUSDC.token)}
  toUnits="10"
  intent="Donate $10"
  preferredChains={[8453, 137]} // Prefer Base and Polygon
  preferredTokens={[
    { chain: 8453, address: getAddress(baseUSDC.token) }, // Base USDC first
  ]}
/>
```

### Pattern 3: Solana/Stellar Support

```tsx
<RozoPayButton
  appId="rozoDemoMP"
  // REQUIRED: Base chain config (settlement layer)
  toChain={8453} // MUST be Base Chain (8453)
  toToken={getAddress(baseUSDC.token)} // MUST be Base USDC
  toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")} // Any valid EVM address
  // Your actual destinations
  toSolanaAddress="DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
  toStellarAddress="GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ"
  toUnits="15"
  intent="Multi-Chain Payment"
/>
```

**⚠️ CRITICAL: Solana/Stellar Configuration Requirements**

When using `toSolanaAddress` or `toStellarAddress`, you **MUST** set:

- `toChain` to Base Chain (8453)
- `toToken` to Base USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- The `toAddress` can be any valid EVM address in this case

This is because RozoAI uses Base chain as the settlement layer for cross-chain payments.

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ Missing Provider Wrapper

```tsx
// DON'T DO THIS - Missing providers
function App() {
  return <RozoPayButton {...props} />; // ❌ Will crash
}

// ✅ DO THIS - Proper provider setup
function App() {
  return (
    <Providers>
      <RozoPayButton {...props} />
    </Providers>
  );
}
```

### ❌ Wrong Import Paths

```tsx
// ❌ DON'T DO THIS
import { RozoPayButton } from "@rozoai/connectkit";
import { RozoPayButton } from "rozoai-intent-pay";

// ✅ DO THIS
import { RozoPayButton } from "@rozoai/intent-pay";
```

### ❌ Missing getAddress() Wrapper

```tsx
// ❌ DON'T DO THIS - Raw strings
toAddress="0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2"
toToken="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

// ✅ DO THIS - Wrapped with getAddress()
toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
toToken={getAddress(baseUSDC.token)}
```

### ❌ Mixing payId with appId

```tsx
// ❌ DON'T DO THIS
<RozoPayButton appId="app123" payId="pay456" />

// ✅ DO THIS - Use one approach
<RozoPayButton appId="app123" toChain={8453} {...otherProps} />
// OR
<RozoPayButton payId="pay456" />
```

### ❌ Wrong Solana/Stellar Configuration

```tsx
// ❌ DON'T DO THIS - Wrong chain/token for Solana/Stellar
<RozoPayButton
  appId="rozoDemoMP"
  toChain={1}  // ❌ Wrong chain
  toToken={getAddress("0xA0b86a33...")}  // ❌ Wrong token
  toSolanaAddress="DYw8jCTf..."
/>

// ✅ DO THIS - Correct Base chain config
<RozoPayButton
  appId="rozoDemoMP"
  toChain={8453}  // ✅ Base chain
  toToken={getAddress(baseUSDC.token)}  // ✅ Base USDC
  toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
  toSolanaAddress="DYw8jCTf..."
/>
```

## 🎯 Supported Chains & Tokens

### 🔗 Blockchains (AI Services: Use these Chain IDs)

| Chain       | Chain ID | Supported Token | Usage in Code          |
| ----------- | -------- | --------------- | ---------------------- |
| **Base**    | 8453     | USDC            | `toChain={8453}`       |
| **Polygon** | 137      | USDC            | `toChain={137}`        |
| **BSC**     | 56       | USDT            | `toChain={56}`         |
| **Solana**  | Special  | USDC            | Use `toSolanaAddress`  |
| **Stellar** | Special  | USDC            | Use `toStellarAddress` |

### 💰 Common Token Addresses (Copy-Paste Ready)

```tsx
// Base USDC (RECOMMENDED for most use cases)
import { baseUSDC } from "@rozoai/intent-common";
toChain={baseUSDC.chainId}           // 8453
toToken={getAddress(baseUSDC.token)} // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

// Polygon USDC
toChain={137}
toToken={getAddress("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174")}

// BSC USDT
toChain={56}
toToken={getAddress("0x55d398326f99059fF775485246999027B3197955")}
```

## 💳 Payment Methods Your Users Can Use

### 🔌 Crypto Wallets

- **Desktop**: MetaMask, Coinbase Wallet, Rainbow, Trust Wallet
- **Mobile**: All wallets via deep-linking
- **Solana**: Phantom, Backpack, Solflare
- **Stellar**: Any Stellar wallet compatible with your `toStellarAddress`
- **Advanced**: Hardware wallets, multisig wallets

## 🔧 AI SERVICE PROMPT TEMPLATES

### Template 1: Basic Payment Button

```
Create a React component that accepts crypto payments using RozoAI Intent Pay SDK.
Requirements:
- Accept $10 USDC payments on Base chain
- Use demo app ID "rozoDemoMP"
- Show success/error alerts
- Include all required providers (WagmiProvider, QueryClientProvider, RozoPayProvider)
- Use proper TypeScript types
```

### Template 2: E-commerce Checkout

```
Create a crypto payment checkout page using RozoAI Intent Pay SDK.
Requirements:
- Multiple payment amounts ($5, $25, $100)
- Different button text for each amount
- Handle payment events with console logs
- Include providers setup in separate file
- Use Base USDC as the payment token
```

### Template 3: Multi-Chain Support (within supported networks)

```
Create a donation component using RozoAI Intent Pay SDK that supports:
- Base, Polygon, Solana, Stellar, and BSC payments (USDT)
- $20 donation amount
- Prefer Base and Polygon chains
- Include Solana address support
- Show payment status updates
```

## 📋 ESSENTIAL API REFERENCE (AI Services)

### Core Props (ALWAYS REQUIRED)

```tsx
<RozoPayButton
  appId="rozoDemoMP" // Demo app ID
  toChain={8453} // Base chain ID
  toAddress={getAddress("0x...")} // Your wallet address
  toToken={getAddress(baseUSDC.token)} // USDC token
  toUnits="10" // $10 USDC
  intent="Pay Now" // Button text
/>
```

### Event Handlers (RECOMMENDED)

```tsx
  onPaymentStarted={(event) => {
  console.log("Payment started:", event.paymentId);
  // Show loading state
  }}
  onPaymentCompleted={(event) => {
  console.log("Payment completed:", event.txHash);
  // Fulfill order, show success
  }}
  onPaymentBounced={(event) => {
  console.log("Payment failed:", event);
  // Handle refund, show error
}}
```

### Optional Customization

```tsx
// Chain/token preferences
preferredChains={[8453, 137]}           // Prefer Base, Polygon
preferredTokens={[                      // Prefer specific tokens
  { chain: 8453, address: getAddress(baseUSDC.token) }
]}

// UI customization
theme="minimal"                         // Built-in themes
mode="auto"                            // Light/dark mode
disabled={false}                       // Enable/disable button

// Multi-chain destinations
toSolanaAddress="DYw8jCTf..."          // Solana wallet
toStellarAddress="GABC123..."          // Stellar wallet

// Tracking
metadata={{ orderId: "123" }}          // Custom metadata
externalId="order_456"                 // Your tracking ID
```

## 🚨 TESTING CHECKLIST

Before submitting code, AI services should verify:

### ✅ Provider Setup

- [ ] `WagmiProvider` wraps the app with `wagmiConfig`
- [ ] `QueryClientProvider` wraps with `queryClient`
- [ ] `RozoPayProvider` wraps with correct `payApiUrl`
- [ ] All providers are in correct nesting order

### ✅ Imports

- [ ] `@rozoai/intent-pay` package imported correctly
- [ ] `getAddress` imported from `viem`
- [ ] `baseUSDC` imported from `@rozoai/intent-common` (if used)
- [ ] All required React hooks imported

### ✅ Button Props

- [ ] `appId` is set (use "rozoDemoMP" for demos)
- [ ] `toChain` is a valid chain ID (8453 for Base recommended)
- [ ] `toAddress` wrapped in `getAddress()`
- [ ] `toToken` wrapped in `getAddress()`
- [ ] `toUnits` is a string (e.g., "10" not 10)
- [ ] `intent` prop used for button text

### ✅ Solana/Stellar Support (If Used)

- [ ] `toChain` set to Base Chain (8453) when using `toSolanaAddress` or `toStellarAddress`
- [ ] `toToken` set to Base USDC when using Solana/Stellar addresses
- [ ] `toAddress` can be any valid EVM address for Solana/Stellar payments

### ✅ Event Handlers

- [ ] `onPaymentStarted` logs payment ID
- [ ] `onPaymentCompleted` logs transaction hash
- [ ] `onPaymentBounced` handles errors gracefully

### ✅ TypeScript

- [ ] All imports have proper types
- [ ] Address types use `Address` from `viem`
- [ ] Event handlers have correct event types

## 🎉 SUCCESS EXAMPLES

### Next.js App Router Example

```tsx
// app/providers.tsx
"use client";
import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

const wagmiConfig = createConfig(getDefaultConfig({ appName: "Demo" }));
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl="https://intentapi.rozo.ai" debugMode>
          {children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// app/layout.tsx
import { Providers } from "./providers";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// app/page.tsx
("use client");
import { RozoPayButton } from "@rozoai/intent-pay";
import { baseUSDC } from "@rozoai/intent-common";
import { getAddress } from "viem";

export default function HomePage() {
  return (
    <RozoPayButton
      appId="rozoDemoMP"
      toChain={baseUSDC.chainId}
      toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
      toToken={getAddress(baseUSDC.token)}
      toUnits="5"
      intent="Pay $5"
      onPaymentCompleted={() => alert("Payment successful! 🎉")}
    />
  );
}
```

### Vite/CRA Example

```tsx
// src/providers.tsx
import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

const wagmiConfig = createConfig(getDefaultConfig({ appName: "Demo" }));
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl="https://intentapi.rozo.ai" debugMode>
          {children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// src/App.tsx
import { RozoPayButton } from "@rozoai/intent-pay";
import { baseUSDC } from "@rozoai/intent-common";
import { getAddress } from "viem";
import { Providers } from "./providers";

function PaymentApp() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Crypto Payment Demo</h1>
      <RozoPayButton
        appId="rozoDemoMP"
        toChain={baseUSDC.chainId}
        toAddress={getAddress("0x742d35Cc6634C0532925a3b8D454A3fE1C11C4e2")}
        toToken={getAddress(baseUSDC.token)}
        toUnits="10"
        intent="Pay $10"
        onPaymentCompleted={() => console.log("Payment completed! 🎉")}
      />
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <PaymentApp />
    </Providers>
  );
}
```

---

## 📚 ADDITIONAL RESOURCES (Optional Reading)

### Built-in Themes

```tsx
theme = "minimal"; // Clean, minimal design
theme = "rounded"; // Rounded corners, modern
theme = "retro"; // Retro/vintage style
theme = "midnight"; // Dark theme
theme = "web95"; // Windows 95 nostalgic
theme = "soft"; // Soft, gentle colors
theme = "nouns"; // Nouns DAO inspired
theme = "auto"; // Matches system preference (default)
```

### Advanced Configuration

```tsx
// Custom wagmi config
const customWagmiConfig = createConfig({
  // Your custom chains, connectors, etc.
});

<RozoPayProvider wagmiConfig={customWagmiConfig}>
  <App />
</RozoPayProvider>

// Custom API URL (for enterprise)
<RozoPayProvider payApiUrl="https://your-api.com">
  <App />
</RozoPayProvider>
```

### Production Checklist

- [ ] Replace demo app ID with your production app ID
- [ ] Update wallet addresses to your actual addresses
- [ ] Set up webhook endpoints for reliable payment tracking
- [ ] Test on all target chains and wallets
- [ ] Implement proper error handling and user feedback
- [ ] Add loading states during payment processing

---

**Made with ❤️ by the RozoAI team**

_Simplifying crypto payments, one transaction at a time._

## 📞 Support & Resources

- 📖 **Documentation**: [docs.rozo.ai](https://docs.rozo.ai)
- 💬 **Discord**: [discord.gg/rozoai](https://discord.com/invite/EfWejgTbuU)
- 🐛 **Issues**: [GitHub Issues](https://github.com/rozoai/intent-pay/issues)
- 📧 **Email**: support@rozo.ai

## Demo Link

[🔗 demo.rozo.ai](https://demo.rozo.ai/)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🚀 Single Prompt Hit to Generate

Use this copy-ready prompt to generate a complete, production-ready Next.js 15 App Router example with TailwindCSS that can be deployed with a single command.

### 📋 One-Command Prompt

```text
You are an expert Next.js + Web3 developer.
Create a complete Next.js 15 App Router project with RozoAI Intent Pay SDK integration.

Requirements:
- Next.js 15 App Router with TypeScript
- TailwindCSS for styling
- Complete package.json with all dependencies and scripts
- Payment form with Address and Amount inputs
- Show RozoPayButton only when both fields are filled
- "Generate Pay Button" that opens modal immediately with defaultOpen
- Base USDC payments only (toChain=8453, baseUSDC from @rozoai/intent-common)
- Modern, responsive UI with proper form validation
- Production-ready error handling

Output exactly these files in order:
1. package.json (complete with dependencies and scripts)
2. tailwind.config.js
3. app/globals.css (with Tailwind directives)
4. app/providers.tsx (WagmiProvider, QueryClientProvider, RozoPayProvider)
5. app/layout.tsx (with Providers and TailwindCSS)
6. app/page.tsx (payment form with Tailwind classes)

Include:
- All necessary dependencies (@rozoai/intent-pay, @rozoai/intent-common, wagmi, viem, etc.)
- TailwindCSS setup
- Proper TypeScript types
- Form validation and UX improvements
- Mobile-responsive design

Reference: [URL of this MD]
```

### 🔗 Instant Generation with Lovable

**Generate instantly with one click using Lovable's Build with URL:**

[![Generate with Lovable](https://img.shields.io/badge/Generate%20with-Lovable-FF6B6B?style=for-the-badge&logo=rocket)](<https://lovable.dev/?autosubmit=true#prompt=You%20are%20an%20expert%20Next.js%20%2B%20Web3%20developer.%0ACreate%20a%20complete%20Next.js%2015%20App%20Router%20project%20with%20RozoAI%20Intent%20Pay%20SDK%20integration.%0A%0ARequirements%3A%0A-%20Next.js%2015%20App%20Router%20with%20TypeScript%0A-%20TailwindCSS%20for%20styling%0A-%20Complete%20package.json%20with%20all%20dependencies%20and%20scripts%0A-%20Payment%20form%20with%20Address%20and%20Amount%20inputs%0A-%20Show%20RozoPayButton%20only%20when%20both%20fields%20are%20filled%0A-%20%22Generate%20Pay%20Button%22%20that%20opens%20modal%20immediately%20with%20defaultOpen%0A-%20Base%20USDC%20payments%20only%20(toChain%3D8453%2C%20baseUSDC%20from%20%40rozoai%2Fintent-common)%0A-%20Modern%2C%20responsive%20UI%20with%20proper%20form%20validation%0A-%20Production-ready%20error%20handling%0A%0AOutput%20exactly%20these%20files%20in%20order%3A%0A1.%20package.json%20(complete%20with%20dependencies%20and%20scripts)%0A2.%20tailwind.config.js%0A3.%20app%2Fglobals.css%20(with%20Tailwind%20directives)%0A4.%20app%2Fproviders.tsx%20(WagmiProvider%2C%20QueryClientProvider%2C%20RozoPayProvider)%0A5.%20app%2Flayout.tsx%20(with%20Providers%20and%20TailwindCSS)%0A6.%20app%2Fpage.tsx%20(payment%20form%20with%20Tailwind%20classes)%0A%0AInclude%3A%0A-%20All%20necessary%20dependencies%20(%40rozoai%2Fintent-pay%2C%20%40rozoai%2Fintent-common%2C%20wagmi%2C%20viem%2C%20etc.)%0A-%20TailwindCSS%20setup%0A-%20Proper%20TypeScript%20types%0A-%20Form%20validation%20and%20UX%20improvements%0A-%20Mobile-responsive%20design>)

**How it works:**

1. Click the "Generate with Lovable" button above
2. Sign in to Lovable (if not already logged in)
3. The complete RozoAI payment app will be generated instantly
4. Deploy to production with one click

**Features of the generated app:**

- ✅ Complete Next.js 15 setup with TypeScript
- ✅ TailwindCSS styling and responsive design
- ✅ Form validation with real-time feedback
- ✅ RozoAI Intent Pay integration
- ✅ Production-ready deployment

> **Note:** The Lovable integration uses their [Build with URL feature](https://docs.lovable.dev/integrations/build-with-url) to programmatically generate applications with pre-configured prompts.

### 🚀 Features Included

- ✅ **Complete Setup** - All files and dependencies included
- ✅ **TailwindCSS** - Modern, responsive styling
- ✅ **Form Validation** - Address validation with `isAddress` from viem
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Mobile Responsive** - Works perfectly on all devices
- ✅ **Production Ready** - Proper TypeScript types and error boundaries
- ✅ **UX Optimized** - Loading states, success feedback, form reset
- ✅ **One Command Deploy** - Ready for Vercel, Netlify, or any platform
