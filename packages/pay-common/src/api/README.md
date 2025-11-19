# API Client Utility

A clean, flexible TypeScript utility for handling API requests to the RozoAI API service.

## Overview

This utility provides a modular approach to API requests with:

- A base client for core HTTP operations
- Endpoint-specific modules for domain operations
- TypeScript interfaces for type safety
- Configuration management for API URLs and tokens
- Pre-configured defaults for RozoAI API

## Default Configuration

The API client comes pre-configured with RozoAI production settings:

```typescript
import { ROZO_API_URL, ROZO_API_TOKEN } from "@rozoai/intent-common";

console.log(ROZO_API_URL); // "https://intentapiv2.rozo.ai/functions/v1"
console.log(ROZO_API_TOKEN); // Pre-configured production token
```

These defaults are automatically used by the API client, so you can start making requests immediately without any configuration.

## Structure

```bash
api/
├── base.ts         # Core API client functionality
├── fee.ts          # Fee calculation endpoint
├── payment.ts      # Payment-specific endpoints
└── README.md       # Documentation
```

## Base API Client

The base client (`base.ts`) provides the foundation for all API requests:

```typescript
import { apiClient, setApiConfig } from "@rozoai/intent-common";

// Configure the API client (optional, uses defaults if not set)
setApiConfig({
  baseUrl: "https://intentapiv2.rozo.ai/functions/v1",
  apiToken: "your-api-token",
});

// Make a GET request
const response = await apiClient.get("/some-endpoint");

// Make a POST request with data
const response = await apiClient.post("/some-endpoint", { data: "value" });

// Make a request with custom headers
const response = await apiClient.get("/some-endpoint", {
  headers: { "Custom-Header": "value" },
});

// Make a request with query parameters
const response = await apiClient.get("/some-endpoint", {
  params: { filter: "active", sort: "desc" },
});
```

## Using Payment API

The payment module provides typed functions for payment operations. The `createRozoPayment` function is the core method for creating cross-chain payments.

### Creating a Payment

The `createRozoPayment` function requires a `PaymentRequestData` object with the following structure:

```typescript
import {
  createRozoPayment,
  getRozoPayment,
  createPaymentBridgeConfig,
  mergedMetadata,
  PaymentRequestData,
} from "@rozoai/intent-common";

// Basic payment creation
const handleSubmitPayment = async () => {
  // First, create payment bridge configuration
  // This determines the preferred payment method and destination
  // payInTokenAddress can be: USDC Base, USDC Polygon, USDC Solana, USDC Stellar, or USDT BNB
  const { preferred, destination } = createPaymentBridgeConfig({
    toChain: 8453, // Base chain
    toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
    toAddress: "0x1234567890123456789012345678901234567890",
    toUnits: "1000000", // 1 USDC (6 decimals)
    payInTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon USDC
  });

  // Construct payment data
  const paymentData: PaymentRequestData = {
    appId: "your-app-id",
    display: {
      intent: "Pay for product",
      paymentValue: "1.00", // Display value in USD
      currency: "USD",
    },
    destination: {
      destinationAddress: destination.destinationAddress,
      chainId: destination.chainId,
      amountUnits: destination.amountUnits,
      tokenSymbol: destination.tokenSymbol,
      tokenAddress: destination.tokenAddress,
    },
    // Spread preferred payment configuration
    ...preferred,
    // Optional: external ID for tracking
    externalId: "order-123",
    // Optional: metadata
    metadata: {
      preferredChain: preferred.preferredChain,
      preferredToken: preferred.preferredToken,
      preferredTokenAddress: preferred.preferredTokenAddress,
      // Merge additional metadata
      ...mergedMetadata({
        customField: "value",
      }),
    },
  };

  // Create the payment
  const response = await createRozoPayment(paymentData);

  if (response.data) {
    console.log("Payment created:", response.data.id);
    console.log("Payment status:", response.data.status);
    console.log("Payment URL:", response.data.url);
  } else if (response.error) {
    console.error("Error creating payment:", response.error.message);
  }
};
```

### Example: Pay Out to Stellar

```typescript
// Paying out to a Stellar address
const { preferred, destination } = createPaymentBridgeConfig({
  toStellarAddress: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // REQUIRED: Stellar address
  toAddress: "0x1234567890123456789012345678901234567890", // REQUIRED: any valid EVM address
  // toChain and toToken are optional (default to USDC Base)
  toUnits: "1000000", // 1 USDC
  payInTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
});

const paymentData: PaymentRequestData = {
  appId: "your-app-id",
  display: {
    intent: "Pay to Stellar wallet",
    paymentValue: "1.00",
    currency: "USD",
  },
  ...preferred,
  destination,
};

const response = await createRozoPayment(paymentData);
```

### Example: Pay Out to Solana

```typescript
// Paying out to a Solana address
const { preferred, destination } = createPaymentBridgeConfig({
  toSolanaAddress: "So11111111111111111111111111111111111111112", // REQUIRED: Solana address
  toAddress: "0x1234567890123456789012345678901234567890", // REQUIRED: any valid EVM address
  // toChain and toToken are optional (default to USDC Base)
  toUnits: "1000000", // 1 USDC
  payInTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
});

const paymentData: PaymentRequestData = {
  appId: "your-app-id",
  display: {
    intent: "Pay to Solana wallet",
    paymentValue: "1.00",
    currency: "USD",
  },
  ...preferred,
  destination,
};

const response = await createRozoPayment(paymentData);
```

### Payment Request Data Structure

The `PaymentRequestData` interface includes:

- **`appId`** (required): Your application identifier
- **`display`** (required): Payment display information
  - `intent`: Description of the payment
  - `paymentValue`: Amount as a string (e.g., "100.00")
  - `currency`: Currency code (e.g., "USD")
- **`destination`** (required): Payment destination configuration
  - `destinationAddress`: Recipient address
  - `chainId`: Destination chain ID as string
  - `amountUnits`: Amount in smallest token unit (as string)
  - `tokenSymbol`: Token symbol (e.g., "USDC")
  - `tokenAddress`: Token contract address
- **`preferredChain`** (optional): Preferred source chain ID
- **`preferredToken`** (optional): Preferred source token symbol
- **`preferredTokenAddress`** (optional): Preferred source token address
- **`externalId`** (optional): External identifier for tracking
- **`metadata`** (optional): Additional metadata object

### Using createPaymentBridgeConfig

The `createPaymentBridgeConfig` helper function simplifies cross-chain payment configuration. It determines the preferred payment method based on the `payInTokenAddress` parameter.

**Important Notes:**

- **For EVM chain payouts (Base, Polygon, etc.)**: Provide `toAddress` with the destination EVM address. `toChain` and `toToken` are optional but default to USDC Base.
- **For Stellar payouts**: You **must** provide `toStellarAddress` with the Stellar address. You **must** also provide `toAddress` with any valid EVM address (required for internal routing). `toChain` and `toToken` are optional but default to USDC Base.
- **For Solana payouts**: You **must** provide `toSolanaAddress` with the Solana address. You **must** also provide `toAddress` with any valid EVM address (required for internal routing). `toChain` and `toToken` are optional but default to USDC Base.

**Supported `payInTokenAddress` values:**

- **USDC Base** - Base chain USDC token
- **USDC Polygon** - Polygon chain USDC token
- **USDC Solana** - Solana USDC token
- **USDC Stellar** - Stellar USDC token (format: `USDC:issuerPK` or issuer public key)
- **USDT BNB** - BSC (Binance Smart Chain) USDT token

```typescript
import { createPaymentBridgeConfig } from "@rozoai/intent-common";

// Example: User pays with Polygon USDC, receives on Base
const { preferred, destination } = createPaymentBridgeConfig({
  toChain: 8453, // Base
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  toAddress: "0x...",
  toUnits: "1000000", // 1 USDC
  payInTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon USDC
});

// preferred contains: preferredChain, preferredToken, preferredTokenAddress
// destination contains: destinationAddress, chainId, amountUnits, tokenSymbol, tokenAddress
```

**More examples:**

```typescript
// Pay with Base USDC
const { preferred, destination } = createPaymentBridgeConfig({
  toChain: 8453,
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  toAddress: "0x...",
  toUnits: "1000000",
  payInTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
});

// Pay with Solana USDC - Pay Out to Solana
// Note: toSolanaAddress is REQUIRED, toAddress is REQUIRED (any valid EVM address)
// toChain and toToken are optional (default to USDC Base)
const { preferred, destination } = createPaymentBridgeConfig({
  toSolanaAddress: "So11111111111111111111111111111111111111112", // Solana destination address
  toAddress: "0x1234567890123456789012345678901234567890", // Required: any valid EVM address
  // toChain and toToken are optional, default to USDC Base
  toUnits: "1000000",
  payInTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Solana USDC
});

// Pay with Stellar USDC - Pay Out to Stellar
// Note: toStellarAddress is REQUIRED, toAddress is REQUIRED (any valid EVM address)
// toChain and toToken are optional (default to USDC Base)
const { preferred, destination } = createPaymentBridgeConfig({
  toStellarAddress: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Stellar destination address
  toAddress: "0x1234567890123456789012345678901234567890", // Required: any valid EVM address
  // toChain and toToken are optional, default to USDC Base
  toUnits: "1000000",
  payInTokenAddress:
    "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Stellar USDC
});

// Pay with BSC USDT
const { preferred, destination } = createPaymentBridgeConfig({
  toChain: 8453,
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  toAddress: "0x...",
  toUnits: "1000000",
  payInTokenAddress: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
});
```

### Getting Payment Details

```typescript
// Get payment by ID
const fetchPaymentDetails = async (paymentId: string) => {
  const response = await getRozoPayment(paymentId);

  if (response.data) {
    console.log("Payment status:", response.data.status);
    console.log("Payment intent:", response.data.display.intent);
    console.log(
      "Destination address:",
      response.data.destination.destinationAddress
    );
    console.log("Transaction hash:", response.data.destination.txHash);
  } else if (response.error) {
    console.error("Error fetching payment:", response.error.message);
  }
};
```

### Real-World Usage Pattern

In the SDK, `createRozoPayment` is typically used within payment flow effects:

```typescript
// Example from paymentEffects.ts
const paymentData: PaymentRequestData = {
  appId: payParams?.rozoAppId ?? payParams?.appId ?? DEFAULT_ROZO_APP_ID,
  display: {
    intent: order?.metadata?.intent ?? "",
    paymentValue: String(toUnits),
    currency: "USD",
  },
  ...preferred, // Spread preferred config from createPaymentBridgeConfig
  destination, // Destination config from createPaymentBridgeConfig
  externalId: order?.externalId ?? "",
  metadata: {
    preferredChain: preferred.preferredChain,
    preferredToken: preferred.preferredToken,
    preferredTokenAddress: preferred.preferredTokenAddress,
    ...mergedMetadata({
      ...(payParams?.metadata ?? {}),
      ...(order?.metadata ?? {}),
      ...(order.userMetadata ?? {}),
    }),
  },
};

const rozoPayment = await createRozoPayment(paymentData);
if (!rozoPayment?.data?.id) {
  throw new Error(rozoPayment?.error?.message ?? "Payment creation failed");
}
```

## React Hooks

React hooks for these APIs are available in the `@rozoai/intent-pay` package. The SDK handles payment creation internally through the payment state machine, but you can access payment state using hooks:

```typescript
// In @rozoai/intent-pay
import { useRozoPay, useRozoPayStatus, useRozoPayUI } from "@rozoai/intent-pay";

// Use in React components
const PaymentComponent = () => {
  const { createPreviewOrder, payWallet } = useRozoPay();
  const { paymentStatus } = useRozoPayStatus();
  const { isOpen, openRozoPay, closeRozoPay } = useRozoPayUI();

  // Payment creation is handled internally by the SDK
  // when using RozoPayButton or calling createPreviewOrder
  // The SDK automatically uses createRozoPayment under the hood

  if (paymentStatus === "payment_completed") {
    return <div>Payment successful!</div>;
  }

  return <RozoPayButton {...paymentProps} />;
};
```

Note: The SDK's payment flow automatically handles `createRozoPayment` calls internally. You typically don't need to call it directly when using the SDK components.

## Error Handling

All API responses include standardized error handling:

```typescript
const response = await createRozoPayment(data);

if (response.error) {
  // Handle error
  console.error("API Error:", response.error.message);
  return;
}

// Process successful response
const paymentData = response.data;
```

## TypeScript Integration

All functions are fully typed:

```typescript
import { PaymentResponseData, ApiResponse } from "@rozoai/intent-common";

const response: ApiResponse<PaymentResponseData> = await getRozoPayment(
  paymentId
);
// response.data will be typed as PaymentResponseData | null
```

## Configuration

### Using Default Configuration

The API client is pre-configured with production RozoAI settings, so you can use it immediately:

```typescript
import {
  createRozoPayment,
  createPaymentBridgeConfig,
} from "@rozoai/intent-common";

// Works out of the box with default configuration
const { preferred, destination } = createPaymentBridgeConfig({
  toChain: 8453,
  toToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  toAddress: "0x...",
  toUnits: "10000000",
  payInTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
});

const response = await createRozoPayment({
  appId: "your-app-id",
  display: { intent: "Payment", paymentValue: "10.00", currency: "USD" },
  ...preferred,
  destination,
});
```

### Customizing Configuration

For testing, staging, or custom environments, you can override the defaults:

```typescript
import {
  setApiConfig,
  getApiConfig,
  ROZO_API_URL,
  ROZO_API_TOKEN,
} from "@rozoai/intent-common";

// Override for staging environment
setApiConfig({
  baseUrl: "https://staging-api.rozo.ai/v1",
  apiToken: "your-staging-token",
});

// Or reset to production defaults
setApiConfig({
  baseUrl: ROZO_API_URL,
  apiToken: ROZO_API_TOKEN,
});

// Get current configuration
const config = getApiConfig();
console.log(config.baseUrl, config.apiToken);
```

### Configuration in Different Environments

**Production (Default):**

```typescript
// No configuration needed - uses ROZO_API_URL and ROZO_API_TOKEN automatically
import { createRozoPayment } from "@rozoai/intent-common";
const response = await createRozoPayment(data);
```

**Staging:**

```typescript
import { setApiConfig } from "@rozoai/intent-common";

setApiConfig({
  baseUrl: "https://staging.intentapi.rozo.ai/v1",
  apiToken: process.env.STAGING_API_TOKEN,
});
```

**Development/Testing:**

```typescript
import { setApiConfig } from "@rozoai/intent-common";

setApiConfig({
  baseUrl: "http://localhost:3000/api",
  apiToken: "dev_token",
});
```

## Using Fee API

The fee module provides a function to calculate fees for payment amounts:

```typescript
import { getFee } from "@rozoai/intent-common";

// Get fee calculation (only amount is required)
const calculateFee = async () => {
  const response = await getFee({
    amount: 0.1,
    // Optional parameters with defaults:
    // appId: "rozodemo",
    // currency: "USDC"
  });

  if (response.data) {
    console.log("Fee:", response.data.fee);
    console.log("Fee Percentage:", response.data.feePercentage);
    console.log("Amount Out:", response.data.amount_out);
    console.log("Minimum Fee:", response.data.minimumFee);
  } else if (response.error) {
    console.error("Error calculating fee:", response.error.message);
    // Error response includes details like max allowed amount
  }
};

// With custom appId and currency
const response = await getFee({
  amount: 100,
  appId: "myapp",
  currency: "USDC",
});
```

## Available Payment Functions

- **`createRozoPayment(paymentData: PaymentRequestData)`** - Create a new cross-chain payment. Requires `appId`, `display`, and `destination`. Use `createPaymentBridgeConfig` to generate `preferred` and `destination` configurations. Returns `ApiResponse<PaymentResponseData>` with payment ID, status, and URL.

- **`getRozoPayment(paymentId: string)`** - Get payment details by ID. Automatically handles both standard payment IDs and MugglePay order IDs. Returns `ApiResponse<PaymentResponseData>` with full payment information including status, destination, and transaction hashes.

### Helper Functions

- **`createPaymentBridgeConfig(config: PaymentBridgeConfig)`** - Creates payment bridge configuration for cross-chain payments. Determines preferred payment method (source chain/token) and destination configuration. The `payInTokenAddress` parameter supports: USDC Base, USDC Polygon, USDC Solana, USDC Stellar, and USDT BNB. Returns `{ preferred: PreferredPaymentConfig, destination: DestinationConfig }`.

- **`mergedMetadata(...metadataObjects)`** - Utility function to merge multiple metadata objects while handling conflicts and filtering sensitive fields.

## Available Fee Functions

- `getFee(params)` - Calculate fee for a payment amount (amount required, appId and currency optional)

## Best Practices

- Configure the API client once at app initialization
- Leverage TypeScript interfaces for type safety
- Handle loading, error, and success states properly
- Use the React hooks (from @rozoai/intent-pay) when working in React components
- Implement proper error handling for all API calls
