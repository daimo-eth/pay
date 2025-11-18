import { apiClient, ApiResponse } from "./base";

/**
 * Payment display information
 */
export interface PaymentDisplay {
  intent: string;
  paymentValue: string;
  currency: string;
}

/**
 * Payment destination information
 */
export interface PaymentDestination {
  destinationAddress?: string;
  chainId: string;
  amountUnits: string;
  tokenSymbol: string;
  tokenAddress?: string;
  txHash?: string | null;
}

/**
 * Payment source information
 */
export interface PaymentSource {
  sourceAddress?: string;
  [key: string]: unknown;
}

/**
 * Payment request data type
 */
export interface PaymentRequestData {
  appId: string;
  display: PaymentDisplay;
  destination: PaymentDestination;
  externalId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Payment response data type
 */
export interface PaymentResponseData {
  id: string;
  status: "payment_unpaid" | string;
  createdAt: string;
  display: {
    intent: string;
    currency: string;
    paymentValue?: string;
  };
  source: PaymentSource | null;
  destination: {
    destinationAddress: string;
    txHash: string | null;
    chainId: string;
    amountUnits: string;
    tokenSymbol: string;
    tokenAddress: string;
  };
  metadata: {
    daimoOrderId?: string;
    intent: string;
    items: unknown[];
    payer: Record<string, unknown>;
    appId: string;
    orderDate: string;
    webhookUrl: string;
    provider: string;
    receivingAddress: string;
    memo: string | null;
    payinchainid: string;
    payintokenaddress: string;
    preferredChain: string;
    preferredToken: string;
    preferredTokenAddress: string;
    source_tx_hash?: string;
    [key: string]: unknown;
  };
  url: string;
  [key: string]: unknown;
}

/**
 * Creates a new payment
 * @param paymentData - Payment data to send
 * @returns Promise with payment response
 */
export const createRozoPayment = (
  paymentData: PaymentRequestData
): Promise<ApiResponse<PaymentResponseData>> => {
  return apiClient.post<PaymentResponseData>("/payment-api", paymentData);
};

/**
 * Gets payment details by ID
 * @param paymentId - Payment ID
 * @returns Promise with payment response
 */
export const getRozoPayment = (
  paymentId: string
): Promise<ApiResponse<PaymentResponseData>> => {
  const isMugglePay = paymentId.includes("mugglepay_order");
  const endpoint = isMugglePay
    ? `payment-api/${paymentId}`
    : `payment/id/${paymentId}`;
  return apiClient.get<PaymentResponseData>(endpoint);
};
