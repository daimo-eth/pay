/**
 * AccountFlowProvider: wraps PrivyProvider + AccountFlowContext.
 *
 * Renders PrivyProvider with the given appId. Inside, PrivyConsumer
 * reads Privy hooks and registers them with the account flow state.
 */
import {
  PrivyProvider,
  useLoginWithEmail,
  useLoginWithSms,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";

import {
  AccountFlowContext,
  useAccountFlowState,
} from "../../hooks/useAccountFlow.js";

type AccountFlowProviderProps = {
  privyAppId: string;
  children: ReactNode;
};

export function AccountFlowProvider({ privyAppId, children }: AccountFlowProviderProps) {
  const accountFlow = useAccountFlowState();

  return (
    <AccountFlowContext.Provider value={accountFlow}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          embeddedWallets: {
            ethereum: { createOnLogin: "off" },
            showWalletUIs: false,
          },
        }}
      >
        <PrivyConsumer accountFlow={accountFlow} />
        {children}
      </PrivyProvider>
    </AccountFlowContext.Provider>
  );
}

function PrivyConsumer({
  accountFlow,
}: {
  accountFlow: ReturnType<typeof useAccountFlowState>;
}) {
  const { ready, authenticated, logout, getAccessToken, createWallet, user } =
    usePrivy();
  const { sendCode: rawSendCode, loginWithCode: rawLoginWithCode } =
    useLoginWithEmail();
  const {
    sendCode: rawSendPhoneCode,
    loginWithCode: rawLoginWithPhoneCode,
  } = useLoginWithSms();
  const { wallets } = useWallets();

  const sendCode = useCallback(
    async (email: string) => {
      await rawSendCode({ email });
    },
    [rawSendCode],
  );

  const loginWithCode = useCallback(
    async (code: string) => {
      await rawLoginWithCode({ code });
    },
    [rawLoginWithCode],
  );

  const sendPhoneCode = useCallback(
    async (phoneNumber: string) => {
      await rawSendPhoneCode({ phoneNumber });
    },
    [rawSendPhoneCode],
  );

  const loginWithPhoneCode = useCallback(
    async (code: string) => {
      await rawLoginWithPhoneCode({ code });
    },
    [rawLoginWithPhoneCode],
  );

  const walletAddress = user?.wallet?.address ?? null;
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  const signTypedData = useCallback(
    async (typedData: Record<string, unknown>): Promise<string> => {
      if (!embeddedWallet) throw new Error("no embedded wallet");
      const provider = await embeddedWallet.getEthereumProvider();
      const result = await provider.request({
        method: "eth_signTypedData_v4",
        params: [walletAddress, JSON.stringify(typedData)],
      });
      return result as string;
    },
    [embeddedWallet, walletAddress],
  );

  const hooks = useMemo(
    () => ({
      sendCode,
      loginWithCode,
      sendPhoneCode,
      loginWithPhoneCode,
      createWallet,
      getAccessToken,
      signTypedData,
      logout,
      ready,
      authenticated,
      walletAddress,
    }),
    [
      ready,
      authenticated,
      walletAddress,
      sendCode,
      loginWithCode,
      sendPhoneCode,
      loginWithPhoneCode,
      createWallet,
      getAccessToken,
      signTypedData,
      logout,
    ],
  );

  useEffect(() => {
    accountFlow.registerPrivy(hooks);
  }, [hooks, accountFlow.registerPrivy]);

  return null;
}
