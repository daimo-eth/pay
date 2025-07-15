import React, { useState, useEffect } from "react";
import { supportedChains } from "@daimo/pay-common";
import { Address, getAddress, isAddress } from "viem";
import {  viemChains } from "./constants";

export interface UAInputParams {
  toChainId: number;
  toToken: Address;
  toAddress: Address;
  refundAddress: Address;
}

interface UAParamsFormProps {
  onChange: (params: UAInputParams) => void;
}


export function UAParamsForm({ onChange }: UAParamsFormProps) {
  const [toChainId, setToChainId] = useState<number>(
    supportedChains[0]?.chainId || 0
  );
  const [toToken, setToToken] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [refundAddress, setRefundAddress] = useState<string>("");

  // Validate and call onChange when inputs are valid
  useEffect(() => {
    if (
      toToken &&
      toAddress &&
      refundAddress &&
      isAddress(toToken) &&
      isAddress(toAddress) &&
      isAddress(refundAddress)
    ) {
      const validParams: UAInputParams = {
        toChainId,
        toToken: getAddress(toToken),
        toAddress: getAddress(toAddress),
        refundAddress: getAddress(refundAddress),
      };
      onChange(validParams);
    }
  }, [toChainId, toToken, toAddress, refundAddress, onChange]);

  return (
    <section>
      <div className="form-group">
        <label htmlFor="chain-select">DESTINATION CHAIN</label>
        <select
          id="chain-select"
          value={toChainId}
          onChange={(e) => setToChainId(Number(e.target.value))}
        >
          {viemChains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="token-input">DESTINATION TOKEN</label>
        <input
          type="text"
          id="token-input"
          placeholder="0x"
          value={toToken}
          onChange={(e) => setToToken(e.target.value)}
          style={{
            borderColor:
              toToken && !isAddress(toToken) ? "#ff6b6b" : undefined,
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="address-input">DESTINATION ADDRESS</label>
        <input
          type="text"
          id="address-input"
          placeholder="0x"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          style={{
            borderColor:
              toAddress && !isAddress(toAddress) ? "#ff6b6b" : undefined,
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="refund-input">REFUND ADDRESS</label>
        <input
          type="text"
          id="refund-input"
          placeholder="0x"
          value={refundAddress}
          onChange={(e) => setRefundAddress(e.target.value)}
          style={{
            borderColor:
              refundAddress && !isAddress(refundAddress)
                ? "#ff6b6b"
                : undefined,
          }}
        />
      </div>
    </section>
  );
}
