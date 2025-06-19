/**
 * This provider is responsible for handling reusable web3 logic across the app.
 */

import React from "react";

import { Address, Chain } from "viem";
import { useAccount } from "wagmi";

import { useChainIsSupported } from "../hooks/useChainIsSupported";
import { useChains } from "../hooks/useChains";

type Web3Context = {
  connect: {
    getUri: (id?: string) => string;
  };
  dapp: {
    chains: Chain[];
  };
  account?: {
    chain: Chain;
    chainIsSupported: boolean;
    address: Address;
  };
};

const Web3Context = React.createContext({
  connect: {
    getUri: () => "",
  },
  dapp: {
    chains: [],
  },
  account: undefined,
} as Web3Context);

export const Web3ContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { address: currentAddress, chain } = useAccount();
  const chainIsSupported = useChainIsSupported(chain?.id);
  const chains = useChains();

  const value = {
    dapp: {
      chains,
    },
    account: currentAddress
      ? {
          chain,
          chainIsSupported,
          address: currentAddress,
        }
      : undefined,
  } as Web3Context;

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => React.useContext(Web3Context);
