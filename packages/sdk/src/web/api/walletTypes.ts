import type { Address } from "viem";
import type { Token } from "../../common/token.js";

export interface DaimoPayToken extends Token {
  token: Address | string;
  usd: number;
  priceFromUsd: number;
  maxAcceptUsd: number;
  maxSendUsd: number;
  displayDecimals: number;
  fiatSymbol?: string;
}

export interface DaimoPayTokenAmount {
  token: DaimoPayToken;
  amount: `${bigint}`;
  usd: number;
}

export type WalletPaymentOption = {
  balance: DaimoPayTokenAmount;
  required: DaimoPayTokenAmount;
  minimumRequired: DaimoPayTokenAmount;
  fees: DaimoPayTokenAmount;
  disabledReason?: string;
  passthroughAddress?: Address;
};
