# API Client Utility

A clean, flexible TypeScript utility for handling API requests to the RozoAI API service.

## Overview

This utility provides a modular approach to API requests with:

- A base client for core HTTP operations
- Endpoint-specific modules for domain operations
- React hooks for seamless integration with components
- TypeScript interfaces for type safety

## Structure

```bash
api/
├── base.ts         # Core API client functionality
├── index.ts        # Re-exports all API modules
├── payment.ts      # Payment-specific endpoints and hooks
└── README.md       # Documentation
```

## Base API Client

The base client (`base.ts`) provides the foundation for all API requests:

```typescript
import { apiClient } from './api/base';

// Make a GET request
const response = await apiClient.get('/some-endpoint');

// Make a POST request with data
const response = await apiClient.post('/some-endpoint', { data: 'value' });

// Make a request with custom headers
const response = await apiClient.get('/some-endpoint', {
  headers: { 'Custom-Header': 'value' }
});

// Make a request with query parameters
const response = await apiClient.get('/some-endpoint', {
  params: { filter: 'active', sort: 'desc' }
});
```

## Using Endpoint-Specific Modules

Each API domain has its own module with typed functions and hooks:

### Payment API Example

```typescript
import { createPayment, useCreatePayment, usePayment } from './api';

// Direct function calls
const handleSubmitPayment = async () => {
  const paymentData = {
    amount: 100,
    currency: 'USD',
    recipient: 'user123'
  };
  
  const response = await createPayment(paymentData);
  
  if (response.data) {
    console.log('Payment created:', response.data.id);
  } else if (response.error) {
    console.error('Error creating payment:', response.error.message);
  }
};

// Using hooks in components
const PaymentForm = () => {
  const [paymentState, submitPayment] = useCreatePayment();
  
  const handleSubmit = (formData) => {
    submitPayment({
      amount: formData.amount,
      currency: formData.currency,
      recipient: formData.recipient
    });
  };
  
  if (paymentState.isLoading) {
    return <div>Processing payment...</div>;
  }
  
  if (paymentState.isError) {
    return <div>Error: {paymentState.error?.message}</div>;
  }
  
  if (paymentState.isSuccess) {
    return <div>Payment successful! ID: {paymentState.data?.id}</div>;
  }
  
  return <PaymentFormComponent onSubmit={handleSubmit} />;
};

// Fetching payment details
const PaymentDetails = ({ paymentId }) => {
  const [paymentState, refetch] = usePayment(paymentId);
  
  if (paymentState.isLoading) {
    return <div>Loading payment details...</div>;
  }
  
  if (paymentState.isError) {
    return <div>Error loading payment: {paymentState.error?.message}</div>;
  }
  
  const payment = paymentState.data;
  
  return (
    <div>
      <h2>Payment Details</h2>
      <p>ID: {payment?.id}</p>
      <p>Amount: {payment?.amount} {payment?.currency}</p>
      <p>Status: {payment?.status}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
};
```

## Generic API Hook

For custom endpoints not covered by domain-specific modules:

```typescript
import { useApiRequest } from './api/base';

const CustomComponent = () => {
  const [state, refetch] = useApiRequest('/custom-endpoint', {
    params: { limit: '10' }
  }, []);
  
  // Access state.data, state.isLoading, etc.
  
  return (
    <div>
      {state.isLoading ? (
        <div>Loading...</div>
      ) : state.isError ? (
        <div>Error: {state.error?.message}</div>
      ) : (
        <div>
          <h2>Data Loaded</h2>
          <pre>{JSON.stringify(state.data, null, 2)}</pre>
          <button onClick={() => refetch()}>Refresh</button>
        </div>
      )}
    </div>
  );
};
```

## Creating New API Modules

To add a new API domain:

1. Create a new file (e.g., `user.ts`) in the `api` directory
2. Import the base client: `import { apiClient } from './base'`
3. Define your domain-specific interfaces
4. Implement your API functions and hooks
5. Export them for use in your application
6. Update `index.ts` to re-export your new module

## Error Handling

All API responses include standardized error handling:

```typescript
const response = await createPayment(data);

if (response.error) {
  // Handle error
  console.error('API Error:', response.error.message);
  return;
}

// Process successful response
const paymentData = response.data;
```

## TypeScript Integration

All functions and hooks are fully typed:

```typescript
// Example of using generic types with the API
interface CustomData {
  id: string;
  name: string;
  createdAt: string;
}

const response = await apiClient.get<CustomData>('/custom-endpoint');
// response.data will be typed as CustomData | null
```

## Best Practices

- Use the domain-specific functions and hooks when available
- Leverage TypeScript interfaces for type safety
- Handle loading, error, and success states in your components
- Use the dependency array in hooks to control when requests are made
- Implement proper error handling for all API calls
