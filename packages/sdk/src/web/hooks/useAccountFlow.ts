import { createContext, useCallback, useContext, useRef, useState } from "react";

import type { AccountRegion, DepositPaymentInfo, EnrollmentResponse } from "../../common/account.js";
import type { DaimoClient } from "../../client/createDaimoClient.js";

/** Privy hooks registered by AccountFlowProvider's PrivyConsumer. */
export type PrivyHooks = {
  sendCode: (email: string) => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  createWallet: () => Promise<{ address: string }>;
  getAccessToken: () => Promise<string | null>;
  signTypedData: (typedData: Record<string, unknown>) => Promise<string>;
  logout: () => Promise<void>;
  authenticated: boolean;
  walletAddress: string | null;
};

export type DepositState = {
  depositAmount: string;
  depositId: string;
  payment: DepositPaymentInfo | null;
  selectedInstitutionId?: string;
};

type SessionContext = { sessionId: string; clientSecret: string };

export type AccountFlowState = {
  email: string;
  setEmail: (email: string) => void;

  isLoggingIn: boolean;
  isAuthenticated: boolean;
  authError: string | null;

  sendOtp: (email?: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;

  isCreatingWallet: boolean;
  walletAddress: string | null;
  createWallet: () => Promise<string | null>;

  getAccessToken: () => Promise<string | null>;
  signTypedData: (typedData: Record<string, unknown>) => Promise<string>;

  depositState: DepositState | null;
  setDepositState: (state: DepositState) => void;

  createAccount: (client: DaimoClient, session: SessionContext) => Promise<void>;
  getAccount: (
    client: DaimoClient,
    session: SessionContext,
    region: AccountRegion,
  ) => Promise<{ nextAction: string } | null>;
  startEnrollment: (
    client: DaimoClient,
    region: AccountRegion,
  ) => Promise<EnrollmentResponse | null>;
  logout: () => Promise<void>;

  /** Register Privy hooks (called by AccountFlowProvider). */
  registerPrivy: (hooks: PrivyHooks) => void;
};

export const AccountFlowContext = createContext<AccountFlowState | null>(null);

export function useAccountFlow(): AccountFlowState | null {
  return useContext(AccountFlowContext);
}

/** Create the account flow state object. Used by the AccountFlowProvider. */
export function useAccountFlowState(): AccountFlowState {
  const [email, setEmail] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [depositState, setDepositState] = useState<DepositState | null>(null);

  const privyRef = useRef<PrivyHooks | null>(null);

  // PrivyConsumer calls registerPrivy on every Privy state change,
  // keeping our state in sync without polling.
  const registerPrivy = useCallback((hooks: PrivyHooks) => {
    privyRef.current = hooks;
    setIsAuthenticated(hooks.authenticated);
    if (hooks.walletAddress) setWalletAddress(hooks.walletAddress);
  }, []);

  const sendOtp = useCallback(async (overrideEmail?: string): Promise<boolean> => {
    const target = overrideEmail ?? email;
    if (!privyRef.current) {
      setAuthError("privy not initialized");
      return false;
    }
    if (!target) {
      setAuthError("email is required");
      return false;
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await privyRef.current.sendCode(target);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "failed to send code");
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [email]);

  const verifyOtp = useCallback(async (code: string): Promise<boolean> => {
    if (!privyRef.current) return false;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await privyRef.current.loginWithCode(code);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "failed to verify code",
      );
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const createWallet = useCallback(async (): Promise<string | null> => {
    if (!privyRef.current) return null;
    setIsCreatingWallet(true);
    try {
      const wallet = await privyRef.current.createWallet();
      setWalletAddress(wallet.address);
      return wallet.address;
    } catch (err) {
      console.error("failed to create wallet:", err);
      return null;
    } finally {
      setIsCreatingWallet(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return privyRef.current?.getAccessToken() ?? null;
  }, []);

  const signTypedData = useCallback(
    async (typedData: Record<string, unknown>): Promise<string> => {
      if (!privyRef.current) throw new Error("privy not initialized");
      return privyRef.current.signTypedData(typedData);
    },
    [],
  );

  const createAccount = useCallback(
    async (client: DaimoClient, session: SessionContext) => {
      const token = await getAccessToken();
      if (!token || !walletAddress) return;
      await client.account.create(
        { walletAddress },
        session,
        { bearerToken: token },
      );
    },
    [walletAddress, getAccessToken],
  );

  const getAccount = useCallback(
    async (
      client: DaimoClient,
      session: SessionContext,
      region: AccountRegion,
    ): Promise<{ nextAction: string } | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      try {
        return await client.account.get(region, session, {
          bearerToken: token,
        });
      } catch {
        return null;
      }
    },
    [getAccessToken],
  );

  const startEnrollment = useCallback(
    async (
      client: DaimoClient,
      region: AccountRegion,
    ): Promise<EnrollmentResponse | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      return client.account.startEnrollment(
        { region },
        { bearerToken: token },
      );
    },
    [getAccessToken],
  );

  const logout = useCallback(async () => {
    try {
      await privyRef.current?.logout();
    } catch {
      // Ignore — no active session to destroy
    }
    setIsAuthenticated(false);
    setWalletAddress(null);
    setEmail("");
    setAuthError(null);
    setDepositState(null);
  }, []);

  return {
    email,
    setEmail,
    isLoggingIn,
    isAuthenticated,
    authError,
    sendOtp,
    verifyOtp,
    isCreatingWallet,
    walletAddress,
    createWallet,
    getAccessToken,
    signTypedData,
    depositState,
    setDepositState,
    createAccount,
    getAccount,
    startEnrollment,
    logout,
    registerPrivy,
  };
}
