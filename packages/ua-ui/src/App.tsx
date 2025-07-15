import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { assertNotNull, getChainBestUSDC, Token } from "@daimo/pay-common";
import { UAInputParams, UAParamsForm } from "./UAParamsForm";
import { UADisplay } from "./UADisplay";
import { ErrorRow } from "./ErrorRow";
import { universalAddressFactoryAbi } from "./codegen/abis";
import {
  UA_INTENT_FACTORY_ADDRESS,
  UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
} from "./constants";
import { Address } from "viem";

export type UAParams = {
  toChainId: bigint;
  toToken: Address;
  toAddress: Address;
  refundAddress: Address;
  escrow: Address;
};

export type UniversalAddr = {
  params: UAParams;
  address: Address;
  stableOut: Token;
};

export function App() {
  const [input, setInput] = useState<UAInputParams | null>(null);
  
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Prepare the intent for the contract call
  const uaParams: UAParams | undefined = input
    ? {
        toChainId: BigInt(input.toChainId),
        toToken: input.toToken,
        toAddress: input.toAddress,
        refundAddress: input.refundAddress,
        escrow: UNIVERSAL_ADDRESS_MANAGER_ADDRESS,
      }
    : undefined;

  const {
    data: uaAddr,
    error,
    isFetching,
    refetch,
  } = useReadContract({
    chainId: input?.toChainId ?? 0,
    address: UA_INTENT_FACTORY_ADDRESS,
    abi: universalAddressFactoryAbi,
    functionName: "getUniversalAddress",
    args: uaParams ? [uaParams] : undefined,
    query: { enabled: false },
  });

  const ua: UniversalAddr | undefined =
    uaAddr && uaParams
      ? {
          params: uaParams,
          address: uaAddr,
          stableOut: assertNotNull(getChainBestUSDC(Number(uaParams.toChainId))),
        }
      : undefined;

  const handleRefresh = () => {
    if (!uaParams) return;
    console.log("Refreshing...", uaParams);
    refetch();
  };

  const handleWalletClick = () => {
    if (account.isConnected) {
      disconnect();
    } else {
      const injectedConnector = connectors.find(c => c.type === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <main>
      <div className="header">
        <h1>Universal Address</h1>
        <button className="wallet-btn" onClick={handleWalletClick}>
          {account.isConnected && account.address
            ? `${formatAddress(account.address)} ✕`
            : 'CONNECT WALLET'}
        </button>
      </div>

      <UAParamsForm onChange={setInput} />

      <section>
        <button onClick={handleRefresh} disabled={!input || isFetching}>
          Refresh
        </button>
      </section>

      {error && (
        <section>
          <ErrorRow error={error} />
        </section>
      )}

      {ua && !isFetching && <UADisplay ua={ua} />}
    </main>
  );
}
