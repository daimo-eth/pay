import { createContext, useCallback, useContext, useRef, useState } from "react";

import type {
  AccountRail,
  DepositPaymentInfo,
  EnrollmentResponse,
  GetAccountResponse,
} from "../../common/account.js";
import type { DaimoClient } from "../../client/createDaimoClient.js";

/** Auth-provider hooks registered by AccountFlowProvider. */
export type PrivyHooks = {
  sendCode: (email: string) => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  sendPhoneCode: (phoneNumber: string) => Promise<void>;
  loginWithPhoneCode: (code: string) => Promise<void>;
  createWallet: () => Promise<{ address: string }>;
  getAccessToken: () => Promise<string | null>;
  signTypedData: (typedData: Record<string, unknown>) => Promise<string>;
  logout: () => Promise<void>;
  ready: boolean;
  authenticated: boolean;
  walletAddress: string | null;
};

/**
 * Per-session deposit state. Identity is `sessionId`, current user intent is
 * `depositAmount`. `kind` tracks where we are in the draft → commit lifecycle.
 */
export type DepositStateInput =
  | { depositAmount: string; kind: "idle" }
  | { depositAmount: string; kind: "drafting" }
  | {
      depositAmount: string;
      kind: "drafted";
      depositId: string;
      payment: DepositPaymentInfo;
    }
  | {
      depositAmount: string;
      kind: "committed";
      depositId: string;
      payment: DepositPaymentInfo;
      selectedInstitutionId?: string;
    };

export type DepositState = DepositStateInput & { sessionId: string };
type SessionContext = { sessionId: string; clientSecret: string };

export type AccountFlowState = {
  email: string;
  setEmail: (email: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;

  isLoggingIn: boolean;
  /** Whether the auth provider has finished restoring the session from storage. */
  isReady: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;

  sendOtp: (email?: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;

  /** Send a phone OTP. Links the phone if the user is signed in. */
  sendPhoneOtp: (phoneNumber?: string) => Promise<boolean>;
  /** Verify a phone OTP code. On success, the phone is linked to the current user. */
  verifyPhoneOtp: (code: string) => Promise<boolean>;
  isCreatingWallet: boolean;
  walletAddress: string | null;
  createWallet: () => Promise<string | null>;

  getAccessToken: () => Promise<string | null>;
  signTypedData: (typedData: Record<string, unknown>) => Promise<string>;

  getDepositState: (sessionId: string) => DepositState | null;
  setDepositState: (
    sessionId: string,
    state: DepositStateInput,
  ) => void;
  clearDepositState: (sessionId: string) => void;

  createAccount: (client: DaimoClient, session: SessionContext, walletAddress: string) => Promise<void>;
  getAccount: (
    client: DaimoClient,
    session: SessionContext,
    target: { rail: AccountRail },
  ) => Promise<GetAccountResponse | null>;
  startEnrollment: (
    client: DaimoClient,
    target: { rail: AccountRail },
  ) => Promise<EnrollmentResponse | null>;
  logout: () => Promise<void>;

  /** Wait for auth state to finish restoring. Resolves immediately if ready. */
  waitForReady: () => Promise<void>;

  /** Register auth-provider hooks (called by AccountFlowProvider). */
  registerPrivy: (hooks: PrivyHooks) => void;
};

// Context (not a plain hook like useWalletFlow) because the auth provider must
// wrap the components that use these hooks. The account flow state lives above
// the provider so the consumer can bridge auth hooks into it.
// Limitation: one AccountFlowProvider per page = one shared auth session.
export const AccountFlowContext = createContext<AccountFlowState | null>(null);

export function useAccountFlow(): AccountFlowState | null {
  return useContext(AccountFlowContext);
}

export function useSessionDepositState(sessionId: string) {
  const accountFlow = useAccountFlow();
  const depositState = accountFlow?.getDepositState(sessionId) ?? null;

  const setDepositState = useCallback(
    (state: DepositStateInput) => {
      accountFlow?.setDepositState(sessionId, state);
    },
    [accountFlow, sessionId],
  );

  const clearDepositState = useCallback(() => {
    accountFlow?.clearDepositState(sessionId);
  }, [accountFlow, sessionId]);

  return { accountFlow, depositState, setDepositState, clearDepositState };
}

/** Create the account flow state object. Used by the AccountFlowProvider. */
export function useAccountFlowState(): AccountFlowState {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [storedDepositState, setStoredDepositState] =
    useState<DepositState | null>(null);

  const privyRef = useRef<PrivyHooks | null>(null);

  // PrivyConsumer calls registerPrivy on every Privy state change,
  // keeping our state in sync without polling.
  const registerPrivy = useCallback((hooks: PrivyHooks) => {
    privyRef.current = hooks;
    setIsReady(hooks.ready);
    setIsAuthenticated(hooks.authenticated);
    if (hooks.walletAddress) setWalletAddress(hooks.walletAddress);
  }, []);

  const waitForReady = useCallback((): Promise<void> => {
    if (privyRef.current?.ready) return Promise.resolve();
    return new Promise((resolve) => {
      const check = () => {
        if (privyRef.current?.ready) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
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
      await waitForReady();
      await privyRef.current.sendCode(target);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "failed to send code");
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [email, waitForReady]);

  const verifyOtp = useCallback(async (code: string): Promise<boolean> => {
    if (!privyRef.current) return false;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await waitForReady();
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
  }, [waitForReady]);

  const sendPhoneOtp = useCallback(
    async (overridePhone?: string): Promise<boolean> => {
      const target = overridePhone ?? phoneNumber;
      if (!privyRef.current) {
        setAuthError("privy not initialized");
        return false;
      }
      if (!target) {
        setAuthError("phone number is required");
        return false;
      }
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        await waitForReady();
        await privyRef.current.sendPhoneCode(target);
        return true;
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : "failed to send code",
        );
        return false;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [phoneNumber, waitForReady],
  );

  const verifyPhoneOtp = useCallback(async (code: string): Promise<boolean> => {
    if (!privyRef.current) return false;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await waitForReady();
      await privyRef.current.loginWithPhoneCode(code);
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "failed to verify code",
      );
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, [waitForReady]);

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

  const getDepositState = useCallback(
    (sessionId: string): DepositState | null => {
      if (storedDepositState?.sessionId !== sessionId) return null;
      return storedDepositState;
    },
    [storedDepositState],
  );

  const setDepositState = useCallback(
    (sessionId: string, state: DepositStateInput) => {
      setStoredDepositState({ sessionId, ...state });
    },
    [],
  );

  const clearDepositState = useCallback((sessionId: string) => {
    setStoredDepositState((current) =>
      current?.sessionId === sessionId ? null : current,
    );
  }, []);

  const createAccount = useCallback(
    async (client: DaimoClient, session: SessionContext, addr: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("not authenticated");
      await client.account.create(
        { walletAddress: addr },
        session,
        { bearerToken: token },
      );
    },
    [getAccessToken],
  );

  const getAccount = useCallback(
    async (
      client: DaimoClient,
      session: SessionContext,
      target: { rail: AccountRail },
    ): Promise<GetAccountResponse | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      try {
        return await client.account.get(target, session, {
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
      target: { rail: AccountRail },
    ): Promise<EnrollmentResponse | null> => {
      const token = await getAccessToken();
      if (!token) return null;
      return client.account.startEnrollment(target, { bearerToken: token });
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
    setPhoneNumber("");
    setAuthError(null);
    setStoredDepositState(null);
  }, []);

  return {
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    isLoggingIn,
    isReady,
    isAuthenticated,
    authError,
    setAuthError,
    sendOtp,
    verifyOtp,
    sendPhoneOtp,
    verifyPhoneOtp,
    isCreatingWallet,
    walletAddress,
    createWallet,
    getAccessToken,
    signTypedData,
    getDepositState,
    setDepositState,
    clearDepositState,
    createAccount,
    getAccount,
    startEnrollment,
    logout,
    waitForReady,
    registerPrivy,
  };
}
