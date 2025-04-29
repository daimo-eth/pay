/**
 * Below is an example implementation taken largely from the Farcaster
 * connector SDK.
 * https://www.npmjs.com/package/@farcaster/frame-wagmi-connector
 */

import FrameSDK from "@farcaster/frame-sdk";
import {
  ChainNotConfiguredError,
  type Connector,
  createConnector,
} from "@wagmi/core";
import { SwitchChainError, fromHex, getAddress, numberToHex } from "viem";

farcasterConnector.type = "farcasterFrame" as const;

let accountsChanged: Connector["onAccountsChanged"] | undefined;
let chainChanged: Connector["onChainChanged"] | undefined;
let disconnect: Connector["onDisconnect"] | undefined;

export function farcasterConnector() {
  return createConnector<typeof FrameSDK.wallet.ethProvider>((config) => ({
    id: "farcaster",
    name: "Farcaster Wallet",
    rdns: "xyz.farcaster",
    icon: "https://pay.daimo.com/wallet-logos/farcaster-logo.svg",
    type: farcasterConnector.type,

    async connect({ chainId } = {}) {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this);
        // @ts-expect-error - provider type is stricter
        provider.on("accountsChanged", accountsChanged);
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this);
        provider.on("chainChanged", chainChanged);
      }
      if (!disconnect) {
        disconnect = this.onDisconnect.bind(this);
        provider.on("disconnect", disconnect);
      }

      let currentChainId = await this.getChainId();
      if (chainId && currentChainId !== chainId) {
        const chain = await this.switchChain!({ chainId });
        currentChainId = chain.id;
      }

      return {
        accounts: accounts.map((x) => getAddress(x)),
        chainId: currentChainId,
      };
    },
    async disconnect() {
      const provider = await this.getProvider();

      if (accountsChanged) {
        // @ts-expect-error - provider type is stricter
        provider.removeListener("accountsChanged", accountsChanged);
        accountsChanged = undefined;
      }

      if (chainChanged) {
        provider.removeListener("chainChanged", chainChanged);
        chainChanged = undefined;
      }

      if (disconnect) {
        provider.removeListener("disconnect", disconnect);
        disconnect = undefined;
      }
    },
    async getAccounts() {
      const provider = await this.getProvider();
      const accounts = await provider.request({
        method: "eth_accounts",
      });
      return accounts.map((x) => getAddress(x));
    },
    async getChainId() {
      const provider = await this.getProvider();
      const hexChainId = await provider.request({ method: "eth_chainId" });
      return fromHex(hexChainId, "number");
    },
    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return !!accounts.length;
      } catch {
        return false;
      }
    },
    async switchChain({ chainId }) {
      const provider = await this.getProvider();
      const chain = config.chains.find((x) => x.id === chainId);
      if (!chain) {
        throw new SwitchChainError(new ChainNotConfiguredError());
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(chainId) }],
      });

      config.emitter.emit("change", { chainId });

      return chain;
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        this.onDisconnect();
      } else {
        config.emitter.emit("change", {
          accounts: accounts.map((x) => getAddress(x)),
        });
      }
    },
    onChainChanged(chain) {
      const chainId = Number(chain);
      config.emitter.emit("change", { chainId });
    },
    async onDisconnect() {
      config.emitter.emit("disconnect");
    },
    async getProvider() {
      return FrameSDK.wallet.ethProvider;
    },
  }));
}
