/**
 * Parses error messages, attempting to extract meaningful information from JSON error responses
 * @param error - The error object or message to parse
 * @returns A human-readable error message
 */
export function parseErrorMessage(error: unknown): string {
  let message = "Something bad happened";

  // Extract base message
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  // Try to parse JSON error messages
  try {
    const parsed = JSON.parse(message);
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.error) {
      return typeof parsed.error === "string" ? parsed.error : parsed.error.message || message;
    }
  } catch {
    // If parsing fails, return the original message
  }

  return message;
}

/**
 * Categorizes error types for better user experience
 */
export enum ErrorType {
  LIQUIDITY = "liquidity",
  PAYMENT_FAILED = "payment_failed",
  NETWORK = "network",
  INSUFFICIENT_FUNDS = "insufficient_funds",
  REJECTED = "rejected",
  TRUSTLINE = "trustline",
  UNKNOWN = "unknown",
}

/**
 * Determines the error category based on the error message
 * @param errorMessage - The error message to categorize
 * @returns The error category
 */
export function categorizeError(errorMessage: string): ErrorType {
  const lowerMsg = errorMessage.toLowerCase();

  if (lowerMsg.includes("trustline") || lowerMsg.includes("recipient_trustline")) {
    return ErrorType.TRUSTLINE;
  }

  if (lowerMsg.includes("liquidity") || lowerMsg.includes("exceeds limit")) {
    return ErrorType.LIQUIDITY;
  }

  if (lowerMsg.includes("payment failed") || lowerMsg.includes("transaction failed")) {
    return ErrorType.PAYMENT_FAILED;
  }

  if (lowerMsg.includes("network") || lowerMsg.includes("connection")) {
    return ErrorType.NETWORK;
  }

  if (lowerMsg.includes("insufficient funds") || lowerMsg.includes("insufficient balance")) {
    return ErrorType.INSUFFICIENT_FUNDS;
  }

  if (lowerMsg.includes("rejected") || lowerMsg.includes("denied")) {
    return ErrorType.REJECTED;
  }

  return ErrorType.UNKNOWN;
}


