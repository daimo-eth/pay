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
├── index.ts        # Re-exports all API modules
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

The payment module provides typed functions for payment operations:

```typescript
import {
  createRozoPayment,
  getRozoPayment,
  createRozoPaymentRequest,
} from "@rozoai/intent-common";

// Create a payment
const handleSubmitPayment = async () => {
  const paymentData = createRozoPaymentRequest({
    appId: "your-app-id",
    display: {
      intent: "Pay for product",
      paymentValue: "100.00",
      currency: "USD",
    },
    destination: {
      chainId: "8453",
      amountUnits: "100000000",
      tokenSymbol: "USDC",
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
  });

  const response = await createRozoPayment(paymentData);

  if (response.data) {
    console.log("Payment created:", response.data.id);
  } else if (response.error) {
    console.error("Error creating payment:", response.error.message);
  }
};

// Get payment details
const fetchPaymentDetails = async (paymentId: string) => {
  const response = await getRozoPayment(paymentId);

  if (response.data) {
    console.log("Payment status:", response.data.status);
  }
};
```

## React Hooks

React hooks for these APIs are available in the `@rozoai/intent-pay` package:

```typescript
// In @rozoai/intent-pay
import {
  useCreateRozoPayment,
  useRozoPayment,
  useRozoPayments
} from '@rozoai/intent-pay';

// Use in React components
const PaymentForm = () => {
  const [paymentState, submitPayment] = useCreateRozoPayment();

  const handleSubmit = (formData) => {
    submitPayment({
      appId: 'your-app-id',
      display: { ... },
      destination: { ... }
    });
  };

  if (paymentState.isLoading) return <div>Processing...</div>;
  if (paymentState.isError) return <div>Error: {paymentState.error?.message}</div>;
  if (paymentState.isSuccess) return <div>Success! ID: {paymentState.data?.id}</div>;

  return <FormComponent onSubmit={handleSubmit} />;
};
```

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
import { createRozoPayment } from "@rozoai/intent-common";

// Works out of the box with default configuration
const response = await createRozoPayment({
  appId: "your-app-id",
  display: { intent: "Payment", paymentValue: "10.00", currency: "USD" },
  destination: {
    chainId: "8453",
    amountUnits: "10000000",
    tokenSymbol: "USDC",
  },
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

## Available Payment Functions

- `createRozoPayment(paymentData)` - Create a new payment
- `getRozoPayment(paymentId)` - Get payment by ID
- `getRozoPaymentByExternalId(externalId)` - Get payment by external ID
- `updateRozoPayment(paymentId, paymentData)` - Update a payment
- `cancelRozoPayment(paymentId)` - Cancel a payment
- `listRozoPayments(params?)` - List all payments with optional filters
- `createRozoPaymentRequest(options)` - Create a payment request payload

## Best Practices

- Configure the API client once at app initialization
- Leverage TypeScript interfaces for type safety
- Handle loading, error, and success states properly
- Use the React hooks (from @rozoai/intent-pay) when working in React components
- Implement proper error handling for all API calls
