import {
  assert,
  assertNotNull,
  baseUSDC,
  bscUSDT,
  debugJson,
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  DepositAddressPaymentOptions,
  ethereum,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  ExternalPaymentOptionsString,
  generateEVMDeepLink,
  getChainById,
  getOrderDestChainId,
  isCCTPV1Chain,
  mergedMetadata,
  PaymentRequestData,
  PlatformType,
  polygonUSDC,
  readRozoPayOrderID,
  RozoPayHydratedOrderWithOrg,
  RozoPayOrder,
  rozoSolanaUSDC,
  rozoStellarUSDC,
  Token,
  WalletPaymentOption,
  writeRozoPayOrderID,
} from "@rozoai/intent-common";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { erc20Abi, getAddress, Hex, hexToBytes, zeroAddress } from "viem";
import {
  useAccount,
  useEnsName,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import {
  createPaymentBridgeConfig,
  createRozoPayment,
  formatResponseToHydratedOrder,
  PaymentResponseData,
} from "@rozoai/intent-common";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Asset,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import bs58 from "bs58";
import { PayButtonPaymentProps } from "../components/DaimoPayButton";
import { ROUTES } from "../constants/routes";
import { DEFAULT_ROZO_APP_ID } from "../constants/rozoConfig";
import { PaymentEvent, PayParams } from "../payment/paymentFsm";
import { useStellar } from "../provider/StellarContextProvider";
import { Store } from "../stateStore";
import { parseErrorMessage } from "../utils/errorParser";
import { detectPlatform } from "../utils/platform";
import { TrpcClient } from "../utils/trpc";
import { WalletConfigProps } from "../wallets/walletConfigs";
import { useRozoPay } from "./useDaimoPay";
import { useDepositAddressOptions } from "./useDepositAddressOptions";
import { useExternalPaymentOptions } from "./useExternalPaymentOptions";
import useIsMobile from "./useIsMobile";
import { useOrderUsdLimits } from "./useOrderUsdLimits";
import { useSolanaPaymentOptions } from "./useSolanaPaymentOptions";
import { useStellarPaymentOptions } from "./useStellarPaymentOptions";
import { useWalletPaymentOptions } from "./useWalletPaymentOptions";

/** Wallet payment details, sent to processSourcePayment after submitting tx. */
export type SourcePayment = Parameters<
  TrpcClient["processSourcePayment"]["mutate"]
>[0];

/** Creates (or loads) a payment and manages the corresponding modal. */
export interface PaymentState {
  generatePreviewOrder: () => void;
  resetOrder: (payParams?: Partial<PayParams>) => Promise<void>;

  /// RozoPayButton props
  buttonProps: PayButtonPaymentProps | undefined;
  setButtonProps: (props: PayButtonPaymentProps | undefined) => void;

  /// Modal options
  connectedWalletOnly: boolean;
  setConnectedWalletOnly: (value: boolean) => void;

  /// Pay ID for loading an existing order
  setPayId: (id: string | undefined) => void;
  /// Pay params for creating an order on the fly,
  setPayParams: (payParams: PayParams | undefined) => Promise<void>;
  payParams: PayParams | undefined;

  /// True if the user is entering an amount (deposit) vs preset (checkout).
  isDepositFlow: boolean;
  paymentWaitingMessage: string | undefined;
  /// External payment options, loaded from server and filtered by EITHER
  /// 1. the RozoPayButton paymentOptions, or 2. those of rozoPayOrder
  externalPaymentOptions: ReturnType<typeof useExternalPaymentOptions>;
  selectedWallet: WalletConfigProps | undefined;
  selectedWalletDeepLink: string | undefined;
  showSolanaPaymentMethod: boolean;
  showStellarPaymentMethod: boolean;
  paymentOptions: ExternalPaymentOptionsString[] | undefined;
  walletPaymentOptions: ReturnType<typeof useWalletPaymentOptions>;
  solanaPaymentOptions: ReturnType<typeof useSolanaPaymentOptions>;
  stellarPaymentOptions: ReturnType<typeof useStellarPaymentOptions>;
  depositAddressOptions: ReturnType<typeof useDepositAddressOptions>;
  selectedExternalOption: ExternalPaymentOptionMetadata | undefined;
  selectedTokenOption: WalletPaymentOption | undefined;
  selectedSolanaTokenOption: WalletPaymentOption | undefined;
  selectedStellarTokenOption: WalletPaymentOption | undefined;
  selectedDepositAddressOption: DepositAddressPaymentOptionMetadata | undefined;
  getOrderUsdLimit: () => number;
  setPaymentWaitingMessage: (message: string | undefined) => void;
  tokenMode: "evm" | "solana" | "stellar" | "all";
  setTokenMode: (mode: "evm" | "solana" | "stellar" | "all") => void;
  setSelectedWallet: (wallet: WalletConfigProps | undefined) => void;
  setSelectedWalletDeepLink: (deepLink: string | undefined) => void;
  setSelectedExternalOption: (
    option: ExternalPaymentOptionMetadata | undefined
  ) => void;
  setSelectedTokenOption: (option: WalletPaymentOption | undefined) => void;
  setSelectedSolanaTokenOption: (
    option: WalletPaymentOption | undefined
  ) => void;
  setSelectedStellarTokenOption: (
    option: WalletPaymentOption | undefined
  ) => void;
  setSelectedDepositAddressOption: (
    option: DepositAddressPaymentOptionMetadata | undefined
  ) => void;
  setChosenUsd: (usd: number) => void;
  payWithToken: (
    walletOption: WalletPaymentOption,
    store: Store<PaymentState, PaymentEvent>
  ) => Promise<{ txHash: Hex; success: boolean }>;
  payWithExternal: (option: ExternalPaymentOptions) => Promise<string>;
  payWithDepositAddress: (
    option: DepositAddressPaymentOptions,
    store: Store<PaymentState, PaymentEvent>
  ) => Promise<
    | (DepositAddressPaymentOptionData & { externalId: string; memo: string })
    | null
  >;
  payWithSolanaToken: (
    walletPaymentOption: WalletPaymentOption
  ) => Promise<{ txHash: string; success: boolean }>;
  payWithSolanaTokenRozo: (
    walletPaymentOption: WalletPaymentOption,
    rozoPayment: {
      tokenAddress: string;
      destAddress: string;
      usdcAmount: string;
      solanaAmount: string;
      memo?: string;
    }
  ) => Promise<{ txHash: string; success: boolean }>;
  payWithStellarToken: (
    option: WalletPaymentOption,
    rozoPayment: {
      destAddress: string;
      usdcAmount: string;
      stellarAmount: string;
      memo?: string;
    }
  ) => Promise<{ signedTx: string; success: boolean }>;
  openInWalletBrowser: ({
    wallet,
    amountUsd,
    customDeeplink,
  }: {
    wallet: WalletConfigProps;
    amountUsd?: number;
    customDeeplink?: string;
  }) => void;
  senderEnsName: string | undefined;
  setTxHash: (txHash: string) => void;
  txHash: string | undefined;
  setRozoPaymentId: (paymentId: string) => void;
  rozoPaymentId: string | undefined;

  // Wallet addresses for refresh coordination
  ethWalletAddress: string | undefined;
  solanaPubKey: string | undefined;
  stellarPubKey: string | undefined;

  // Order amount for refresh coordination
  orderUsdAmount: number | undefined;

  createPayment: (
    option: WalletPaymentOption,
    store: Store<PaymentState, PaymentEvent>
  ) => Promise<PaymentResponseData | undefined>;
}

export function usePaymentState({
  trpc,
  lockPayParams,
  setRoute,
  log,
  redirectReturnUrl,
}: {
  trpc: TrpcClient;
  lockPayParams: boolean;
  setRoute: (route: ROUTES, data?: Record<string, any>) => void;
  log: (...args: any[]) => void;
  redirectReturnUrl?: string;
}): PaymentState {
  // Cache for payment validation to avoid repeated checks
  const paymentValidationCache = useRef<Map<string, boolean>>(new Map());
  const pay = useRozoPay();

  // Track deposit address calls to prevent duplicates
  const depositAddressCallRef = useRef<Set<DepositAddressPaymentOptions>>(
    new Set()
  );

  // Browser state.
  const [platform, setPlatform] = useState<PlatformType>();
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPlatform(detectPlatform(window.navigator.userAgent));
    }
  }, []);

  // Wallet state.
  const { address: ethWalletAddress } = useAccount();
  const { data: senderEnsName } = useEnsName({
    chainId: ethereum.chainId,
    address: ethWalletAddress,
  });
  const { switchChainAsync } = useSwitchChain();

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  // Solana wallet state.
  const solanaWallet = useWallet();
  const { connection } = useConnection();
  const solanaPubKey = solanaWallet.publicKey?.toBase58();

  // Stellar wallet state.
  const {
    publicKey: stellarPublicKey,
    account: stellarAccount,
    kit: stellarKit,
    connector: stellarConnector,
    server: stellarServer,
  } = useStellar();
  const stellarPubKey = stellarPublicKey;

  // From RozoPayButton props
  const [buttonProps, setButtonProps] = useState<PayButtonPaymentProps>();
  const [currPayParams, setCurrPayParams] = useState<PayParams>();

  // Modal options
  const [connectedWalletOnly, setConnectedWalletOnly] =
    useState<boolean>(false);

  const [paymentWaitingMessage, setPaymentWaitingMessage] = useState<string>();
  const [isDepositFlow, setIsDepositFlow] = useState<boolean>(false);

  const [tokenMode, setTokenMode] = useState<
    "evm" | "solana" | "stellar" | "all"
  >("evm");

  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [rozoPaymentId, setRozoPaymentId] = useState<string | undefined>(
    undefined
  );

  // TODO: backend should determine whether to show solana payment method
  const paymentOptions = useMemo(() => {
    return currPayParams?.paymentOptions;
  }, [buttonProps, currPayParams]);

  // Include by default if paymentOptions not provided. Solana bridging is only
  // supported on CCTP v1 chains.
  const showSolanaPaymentMethod = useMemo(() => {
    return (
      (paymentOptions == null ||
        paymentOptions.includes(ExternalPaymentOptions.Solana)) &&
      pay.order != null &&
      isCCTPV1Chain(getOrderDestChainId(pay.order))
    );
  }, [paymentOptions, pay.order]);

  const showStellarPaymentMethod = useMemo(() => {
    return (
      (paymentOptions == null ||
        paymentOptions.includes(ExternalPaymentOptions.Stellar)) &&
      pay.order != null
    );
  }, [paymentOptions, pay.order]);

  // UI state. Selection for external payment (Binance, etc) vs wallet payment.
  const externalPaymentOptions = useExternalPaymentOptions({
    trpc,
    // allow <RozoPayButton payId={...} paymentOptions={override} />
    filterIds:
      buttonProps?.paymentOptions ?? pay.order?.metadata.payer?.paymentOptions,
    platform,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    mode: pay.order?.mode,
  });
  const walletPaymentOptions = useWalletPaymentOptions({
    trpc,
    address: ethWalletAddress,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    destChainId: pay.order?.destFinalCallTokenAmount.token.chainId,
    preferredChains: pay.order?.metadata.payer?.preferredChains,
    preferredTokens: pay.order?.metadata.payer?.preferredTokens,
    evmChains: pay.order?.metadata.payer?.evmChains,
    isDepositFlow,
    payParams: currPayParams,
    log,
  });
  const solanaPaymentOptions = useSolanaPaymentOptions({
    trpc,
    address: solanaPubKey,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    isDepositFlow,
    payParams: currPayParams,
  });
  const stellarPaymentOptions = useStellarPaymentOptions({
    trpc,
    address: stellarPubKey,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    isDepositFlow,
    payParams: currPayParams,
  });
  const depositAddressOptions = useDepositAddressOptions({
    trpc,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    mode: pay.order?.mode,
    appId: currPayParams?.appId,
  });

  const chainOrderUsdLimits = useOrderUsdLimits({ trpc });

  const [selectedExternalOption, setSelectedExternalOption] =
    useState<ExternalPaymentOptionMetadata>();

  const [selectedTokenOption, setSelectedTokenOption] =
    useState<WalletPaymentOption>();

  const [selectedSolanaTokenOption, setSelectedSolanaTokenOption] =
    useState<WalletPaymentOption>();

  const [selectedStellarTokenOption, setSelectedStellarTokenOption] =
    useState<WalletPaymentOption>();

  const [selectedDepositAddressOption, setSelectedDepositAddressOption] =
    useState<DepositAddressPaymentOptionMetadata>();

  // Clear processing set when selectedDepositAddressOption changes to allow retries
  useEffect(() => {
    depositAddressCallRef.current.clear();
  }, [selectedDepositAddressOption]);

  const [selectedWallet, setSelectedWallet] = useState<WalletConfigProps>();
  const [selectedWalletDeepLink, setSelectedWalletDeepLink] =
    useState<string>();

  const getOrderUsdLimit = () => {
    const DEFAULT_USD_LIMIT = 20000;
    if (pay.order == null || chainOrderUsdLimits.loading) {
      return DEFAULT_USD_LIMIT;
    }
    const destChainId = pay.order.destFinalCallTokenAmount.token.chainId;
    return destChainId in chainOrderUsdLimits.limits
      ? chainOrderUsdLimits.limits[destChainId]
      : DEFAULT_USD_LIMIT;
  };

  // Cached validation helper to avoid repeated checks
  const validatePaymentRequirements = useCallback(
    (walletOption: WalletPaymentOption, paymentState: string) => {
      const cacheKey = `${walletOption.required.token.token}-${walletOption.fees.token.token}-${paymentState}`;

      if (paymentValidationCache.current.has(cacheKey)) {
        return paymentValidationCache.current.get(cacheKey)!;
      }

      const isValid =
        paymentState === "payment_unpaid" ||
        walletOption.required.token.token === walletOption.fees.token.token;

      paymentValidationCache.current.set(cacheKey, isValid);
      return isValid;
    },
    []
  );

  const handleCreateRozoPayment = async (
    walletOption: WalletPaymentOption,
    store: Store<PaymentState, PaymentEvent>
  ): Promise<PaymentResponseData | undefined> => {
    const payParams = currPayParams;
    const order = pay.order;

    const { preferred, destination } = createPaymentBridgeConfig({
      toAddress: String(payParams?.toAddress),
      toSolanaAddress: payParams?.toSolanaAddress,
      toStellarAddress: payParams?.toStellarAddress,
      toUnits: payParams?.toUnits ?? "",
      payInTokenAddress: walletOption.required.token.token,
      log,
    });

    // Merge metadata from all sources, then omit sensitive/implementation-specific keys
    const metadata = mergedMetadata({
      ...(payParams?.metadata ?? {}),
      ...(order?.metadata ?? {}),
      ...(order?.userMetadata ?? {}),
    });

    const paymentData: PaymentRequestData = {
      appId: payParams?.appId ?? DEFAULT_ROZO_APP_ID,
      display: {
        intent: order?.metadata?.intent ?? "",
        paymentValue: String(payParams?.toUnits ?? ""),
        currency: "USD",
      },
      destination,
      externalId: order?.externalId ?? "",
      ...preferred,
      metadata,
    };

    // API Call
    try {
      const response = await createRozoPayment(paymentData);

      if (!response?.data?.id) {
        throw new Error(response?.error?.message ?? "Payment creation failed");
      }

      setRozoPaymentId(response.data.id);
      return response.data;
    } catch (error) {
      const message = parseErrorMessage(error);
      store.dispatch({
        type: "error",
        order: order as RozoPayOrder,
        message,
      });
    }
  };

  /** Commit to a token + amount = initiate payment. */
  const payWithToken = async (
    walletOption: WalletPaymentOption,
    store: Store<PaymentState, PaymentEvent>
  ): Promise<{ txHash: Hex; success: boolean }> => {
    assert(
      ethWalletAddress != null,
      `[PAY TOKEN] null ethWalletAddress when paying on ethereum`
    );
    assert(
      pay.paymentState === "preview" ||
        pay.paymentState === "unhydrated" ||
        pay.paymentState === "payment_unpaid",
      `[PAY TOKEN] paymentState is ${pay.paymentState}, must be preview or unhydrated or payment_unpaid`
    );

    const { required, fees } = walletOption;
    const paymentAmount = BigInt(required.amount) + BigInt(fees.amount);

    // Early validation using cached validation
    if (!validatePaymentRequirements(walletOption, pay.paymentState)) {
      throw new Error(
        `[PAY TOKEN] required token ${debugJson(
          required
        )} does not match fees token ${debugJson(fees)}`
      );
    }

    // Check if we need to create a new Rozo payment (cache this check)
    const needRozoPayment =
      "payinchainid" in pay.order.metadata &&
      Number(pay.order.metadata.payinchainid) !== required.token.chainId;

    // Prepare transaction parameters early (before async operations)
    const isNativeToken = required.token.token === zeroAddress;
    const tokenAddress = isNativeToken
      ? null
      : getAddress(required.token.token);

    // Get hydrated order efficiently with parallel preparation
    let hydratedOrder: RozoPayHydratedOrderWithOrg;
    let paymentId: string | undefined;

    if (pay.paymentState === "payment_unpaid" && !needRozoPayment) {
      // Order is already hydrated, use it directly
      hydratedOrder = pay.order;
    } else if (needRozoPayment) {
      // Create Rozo payment and hydrate in one step
      const res = await handleCreateRozoPayment(walletOption, store as any);

      if (!res) {
        throw new Error("Failed to create Rozo payment");
      }

      paymentId = res.id;
      hydratedOrder = formatResponseToHydratedOrder(res);
    } else {
      // Hydrate existing order
      const res = await pay.hydrateOrder(ethWalletAddress, walletOption);
      hydratedOrder = res.order;
    }

    if (paymentId ?? hydratedOrder.externalId) {
      const newId = (paymentId ?? hydratedOrder.externalId) || undefined;
      setRozoPaymentId(newId);
      pay.setPaymentStarted(String(newId), hydratedOrder);
    }

    const destinationAddress = hydratedOrder.destFinalCall.to;

    // Execute transaction with optimized error handling
    const paymentTxHash = await (async () => {
      try {
        if (isNativeToken) {
          return await sendTransactionAsync({
            to: destinationAddress,
            value: paymentAmount,
          });
        } else {
          if (required.token.chainId !== bscUSDT.chainId) {
            await switchChainAsync({ chainId: required.token.chainId });
          }
          return await writeContractAsync({
            abi: erc20Abi,
            address: tokenAddress!,
            chainId: required.token.chainId,
            functionName: "transfer",
            args: [destinationAddress, paymentAmount],
          });
        }
      } catch (e) {
        if (hydratedOrder.externalId) {
          pay.setPaymentUnpaid(hydratedOrder.externalId);
        }
        console.error(`[PAY TOKEN] error sending token: ${e}`);
        throw e;
      }
    })();

    // Set transaction hash and return result
    setTxHash(paymentTxHash);
    return { txHash: paymentTxHash, success: true };
  };

  // @NOTE: This is Pay In Solana by Daimo (default)
  const payWithSolanaToken = async (
    walletPaymentOption: WalletPaymentOption
  ): Promise<{ txHash: string; success: boolean }> => {
    const inputToken = walletPaymentOption.required.token.token;
    const payerPublicKey = solanaWallet.publicKey;
    assert(
      payerPublicKey != null,
      "[PAY SOLANA] null payerPublicKey when paying on solana"
    );
    assert(
      pay.order?.id != null,
      "[PAY SOLANA] null orderId when paying on solana"
    );
    assert(
      pay.paymentState === "preview" ||
        pay.paymentState === "unhydrated" ||
        pay.paymentState === "payment_unpaid",
      `[PAY SOLANA] paymentState is ${pay.paymentState}, must be preview or unhydrated or payment_unpaid`
    );

    let hydratedOrder: RozoPayHydratedOrderWithOrg;
    if (pay.paymentState !== "payment_unpaid") {
      const res = await pay.hydrateOrder(
        // @TODO: Revalidate this
        undefined, // refundAddress
        walletPaymentOption
      );
      hydratedOrder = res.order;

      log(
        `[PAY SOLANA] Hydrated order: ${JSON.stringify(
          hydratedOrder
        )}, checking out with Solana ${inputToken}`
      );
    } else {
      hydratedOrder = pay.order;
    }

    const paymentTxHash = await (async () => {
      try {
        const serializedTx = await trpc.getSolanaSwapAndBurnTx.query({
          orderId: pay.order.id.toString(),
          userPublicKey: assertNotNull(
            payerPublicKey,
            "[PAY SOLANA] wallet.publicKey cannot be null"
          ).toString(),
          inputTokenMint: inputToken,
        });
        const tx = VersionedTransaction.deserialize(hexToBytes(serializedTx));
        const txHash = await solanaWallet.sendTransaction(tx, connection);
        return txHash;
      } catch (e) {
        throw e;
      }
    })();

    try {
      await pay.paySolanaSource({
        paymentTxHash: paymentTxHash,
        sourceToken: inputToken,
      });
      return { txHash: paymentTxHash, success: true };
    } catch {
      console.error(
        `[PAY SOLANA] could not verify payment tx on chain: ${paymentTxHash}`
      );
      return { txHash: paymentTxHash, success: false };
    }
  };

  // @NOTE: This is Pay In Solana by Rozo
  const payWithSolanaTokenRozo = async (
    walletPaymentOption: WalletPaymentOption,
    rozoPayment: {
      tokenAddress: string;
      destAddress: string;
      usdcAmount: string;
      solanaAmount: string;
      memo?: string;
    }
  ): Promise<{ txHash: string; success: boolean }> => {
    try {
      const payerPublicKey = solanaWallet.publicKey;

      // Initial validation
      if (!payerPublicKey) {
        throw new Error("Solana Public key is null");
      }

      if (!pay.order?.id) {
        throw new Error("Order ID is null");
      }

      if (!connection || !solanaWallet) {
        throw new Error("Solana services not initialized");
      }

      log("[PAY SOLANA] Starting Solana payment transaction", {
        pay,
        rozoPayment,
      });

      log("[PAY SOLANA] Setting up transaction...");

      const instructions: TransactionInstruction[] = [];

      // Set up token addresses
      const mintAddress = new PublicKey(rozoPayment.tokenAddress ?? "");
      const fromKey = new PublicKey(payerPublicKey);
      const toKey = new PublicKey(rozoPayment.destAddress);

      log("[PAY SOLANA] Transaction details:", {
        tokenMint: mintAddress.toString(),
        fromKey: fromKey.toString(),
        toKey: toKey.toString(),
        amount: rozoPayment.usdcAmount,
        memo: rozoPayment.memo,
      });

      // Get token accounts for sender and recipient
      log("[PAY SOLANA] Deriving associated token accounts...");
      const senderTokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        fromKey
      );
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        toKey
      );
      log("[PAY SOLANA] Sender token account:", senderTokenAccount.toString());
      log(
        "[PAY SOLANA] Recipient token account:",
        recipientTokenAccount.toString()
      );

      // Check if recipient token account exists
      log("[PAY SOLANA] Checking if recipient token account exists...");
      const recipientTokenInfo = await connection.getAccountInfo(
        recipientTokenAccount
      );

      // Create recipient token account if it doesn't exist
      if (!recipientTokenInfo) {
        log("[PAY SOLANA] Creating recipient token account...");
        instructions.push(
          createAssociatedTokenAccountInstruction(
            payerPublicKey,
            recipientTokenAccount,
            toKey,
            mintAddress,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Add transfer instruction
      log("[PAY SOLANA] Adding transfer instruction...");
      const transferAmount = parseFloat(rozoPayment.usdcAmount) * 1_000_000;
      log("[PAY SOLANA] Transfer amount (with decimals):", transferAmount);

      instructions.push(
        createTransferCheckedInstruction(
          senderTokenAccount,
          mintAddress,
          recipientTokenAccount,
          fromKey,
          transferAmount,
          6
        )
      );

      // Add memo if provided
      if (rozoPayment.memo) {
        log("[PAY SOLANA] Adding memo instruction:", rozoPayment.memo);
        instructions.push(
          new TransactionInstruction({
            keys: [
              { pubkey: payerPublicKey, isSigner: true, isWritable: true },
            ],
            programId: new PublicKey(
              "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
            ),
            data: Buffer.from(rozoPayment.memo, "utf-8"),
          })
        );
      }

      // Create and partially sign transaction
      log("[PAY SOLANA] Building transaction...");
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      log("[PAY SOLANA] Got blockhash:", blockhash);

      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = payerPublicKey;
      instructions.forEach((instruction) => transaction.add(instruction));

      // Serialize the transaction
      log("[PAY SOLANA] Serializing transaction...");
      const serializedTransaction = bs58.encode(
        transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
      );

      log("[PAY SOLANA] Sending transaction to wallet for signing...");
      const tx = Transaction.from(bs58.decode(serializedTransaction));
      const txHash = await solanaWallet.sendTransaction(tx, connection);
      log("[PAY SOLANA] Transaction sent! Hash:", txHash);
      return { txHash: txHash, success: true };
    } catch (error) {
      throw error;
    }
  };

  // Stellar payment
  /**
   * Execute a payment using Stellar token
   * @param payToken - The token amount to pay
   * @returns Transaction hash and success status
   */
  const payWithStellarToken = async (
    walletPaymentOption: WalletPaymentOption,
    rozoPayment: {
      destAddress: string;
      usdcAmount: string;
      stellarAmount: string;
      memo?: string;
    }
  ): Promise<{ signedTx: string; success: boolean }> => {
    try {
      // Initial validation
      if (!stellarPublicKey) {
        throw new Error("Stellar Public key is null");
      }

      if (!stellarAccount) {
        throw new Error("Stellar Account is null");
      }

      if (!stellarServer || !stellarKit) {
        throw new Error("Stellar services not initialized");
      }

      const token = walletPaymentOption.required.token;

      const destinationAddress = rozoPayment.destAddress;

      // Setup Stellar payment
      await stellarKit.setWallet(String(stellarConnector?.id ?? "freighter"));
      const sourceAccount = await stellarServer.loadAccount(stellarPublicKey);
      const destAsset = new Asset("USDC", rozoStellarUSDC.token);
      const fee = String(await stellarServer.fetchBaseFee());

      // Build transaction based on token type
      let transaction: TransactionBuilder;
      const isXlmToken = token.symbol === "XLM";

      if (isXlmToken) {
        // const estimatedDestMinAmount = await convertXlmToUsdc(amount);
        transaction = new TransactionBuilder(sourceAccount, {
          fee,
          networkPassphrase: Networks.PUBLIC,
        })
          .addOperation(
            Operation.pathPaymentStrictSend({
              sendAsset: Asset.native(),
              sendAmount: String(rozoPayment.stellarAmount),
              destination: destinationAddress,
              destAsset,
              destMin: rozoPayment.usdcAmount,
              path: [],
            })
          )
          .setTimeout(180);
      } else {
        // For other tokens, use direct payment
        transaction = new TransactionBuilder(sourceAccount, {
          fee,
          networkPassphrase: Networks.PUBLIC,
        })
          .addOperation(
            Operation.payment({
              destination: destinationAddress,
              asset: destAsset,
              amount: String(rozoPayment.usdcAmount),
            })
          )
          .setTimeout(180);
      }

      if (rozoPayment.memo) {
        transaction.addMemo(Memo.text(String(rozoPayment.memo)));
      }

      const transactionBuilder = transaction.build();

      log("[PAY STELLAR] Transaction built", transactionBuilder.toXDR());
      return { signedTx: transactionBuilder.toXDR(), success: true };
    } catch (error: any) {
      log("[PAY STELLAR] Error", error);
      throw new Error(error.message);
    }
  };

  const payWithExternal = async (option: ExternalPaymentOptions) => {
    assert(pay.order != null, "[PAY EXTERNAL] order cannot be null");
    assert(platform != null, "[PAY EXTERNAL] platform cannot be null");

    const { order } = await pay.hydrateOrder();
    const externalPaymentOptionData =
      await trpc.getExternalPaymentOptionData.query({
        id: order.id.toString(),
        externalPaymentOption: option,
        platform,
        redirectReturnUrl,
      });
    assert(
      externalPaymentOptionData != null,
      "[PAY EXTERNAL] missing externalPaymentOptionData"
    );

    log(
      `[PAY EXTERNAL] hydrated order: ${debugJson(
        order
      )}, checking out with external payment: ${option}`
    );

    setPaymentWaitingMessage(externalPaymentOptionData.waitingMessage);

    return externalPaymentOptionData.url;
  };

  const payWithDepositAddress = async (
    option: DepositAddressPaymentOptions,
    store: Store<PaymentState, PaymentEvent>
  ) => {
    // Prevent duplicate calls for the same option
    if (depositAddressCallRef.current.has(option)) {
      log(
        `[PAY DEPOSIT ADDRESS] Already processing ${option}, skipping duplicate call`
      );
      return null;
    }

    // Mark this option as being processed
    depositAddressCallRef.current.add(option);
    log(`[PAY DEPOSIT ADDRESS] Starting processing for ${option}`);

    try {
      let token: Token = baseUSDC;

      if (option === DepositAddressPaymentOptions.SOLANA) {
        token = rozoSolanaUSDC;
      } else if (option === DepositAddressPaymentOptions.STELLAR) {
        token = rozoStellarUSDC;
      } else if (option === DepositAddressPaymentOptions.POLYGON) {
        token = polygonUSDC;
      } else if (option === DepositAddressPaymentOptions.BSC) {
        token = bscUSDT;
      }

      log("[PAY DEPOSIT ADDRESS] hydrating order");

      const { order } = await pay.hydrateOrder(undefined, {
        required: {
          token: {
            token: token.token,
          } as any,
        } as any,
      } as any);

      log(
        `[PAY DEPOSIT ADDRESS] hydrated order ${order.id} for ${order.usdValue} USD, checking out with deposit address: ${option}`
      );

      // const result = await trpc.getDepositAddressForOrder.query({
      //   orderId: order.id.toString(),
      //   option,
      // });

      const chain = getChainById(token.chainId);

      log(order);

      const evmDeeplink = generateEVMDeepLink({
        amountUnits: order.destFinalCallTokenAmount.amount,
        chainId: order.destFinalCallTokenAmount.token.chainId,
        recipientAddress: order.destFinalCall.to,
        tokenAddress: order.destFinalCallTokenAmount.token.token,
      });

      return {
        address: order.destFinalCall.to,
        amount: String(order.usdValue),
        suffix: `${token.symbol} ${chain.name}`,
        uri: evmDeeplink,
        expirationS: Math.floor(Date.now() / 1000) + 300,
        externalId: order.externalId ?? "",
        memo: order.metadata?.memo || "",
      };
    } catch (error) {
      const message = parseErrorMessage(error);
      store.dispatch({
        type: "error",
        order: pay.order as RozoPayOrder,
        message,
      });
      return null;
    } finally {
      // Remove from processing set when done (allow retries after completion/failure)
      depositAddressCallRef.current.delete(option);
      log(`[PAY DEPOSIT ADDRESS] Finished processing for ${option}`);
    }
  };

  const { isIOS } = useIsMobile();

  const openInWalletBrowser = ({
    wallet,
    amountUsd,
    customDeeplink,
  }: {
    wallet: WalletConfigProps;
    amountUsd?: number;
    customDeeplink?: string;
  }) => {
    const paymentState = pay.paymentState;
    let payId = "";

    if (!customDeeplink) {
      assert(
        paymentState === "payment_unpaid",
        `[OPEN IN WALLET BROWSER] paymentState is ${paymentState}, must be payment_unpaid`
      );

      payId = writeRozoPayOrderID(pay.order.id);
    }

    assert(
      wallet.getRozoPayDeeplink != null,
      `openInWalletBrowser: missing deeplink for ${wallet.name}`
    );

    let ref: string | undefined = undefined;

    // Refer to: https://stackoverflow.com/a/78637988/13172178
    if (wallet.name === "Phantom") {
      ref = isIOS ? "1598432977" : "app.phantom";
    }

    const deeplink = wallet.getRozoPayDeeplink({
      payId: pay.order?.externalId ?? pay.rozoPaymentId ?? payId,
      ref,
      appId: currPayParams?.appId,
      customDeeplink,
    });

    // If we are in IOS, we don't open the deeplink in a new window, because it
    // will not work, the link will be opened in the page WAITING_WALLET
    if (!isIOS) {
      window.open(deeplink, "_blank");
    }
    setSelectedWallet(wallet);
    setSelectedWalletDeepLink(deeplink);
    setRoute(ROUTES.WAITING_WALLET, {
      amountUsd,
      payId,
      wallet_name: wallet.name,
    });
  };

  /** User picked a different deposit amount. */
  const setChosenUsd = (usd: number) => {
    assert(
      pay.paymentState === "preview",
      "[SET CHOSEN USD] paymentState is not preview"
    );

    // Too expensive to make an API call to regenerate preview order each time
    // the user changes the amount. Instead, we modify the order in memory.
    pay.setChosenUsd(usd);
  };

  const setPayId = useCallback(
    async (payId: string | undefined) => {
      if (lockPayParams || payId == null) return;
      const paymentId = pay.order?.externalId ?? payId;

      try {
        const id = readRozoPayOrderID(paymentId).toString();

        if (pay.order?.id && BigInt(id) == pay.order.id) {
          // Already loaded, ignore.
          return;
        }
      } catch (error) {
        log("setPayId", error);
      }

      pay.reset();
      pay.setPayId(paymentId);
    },
    [lockPayParams, pay]
  );

  /** Called whenever params change. */
  const setPayParams = async (payParams: PayParams | undefined) => {
    if (!payParams || lockPayParams) return;
    assert(payParams != null, "[SET PAY PARAMS] payParams cannot be null");

    log("[SET PAY PARAMS] setting payParams", payParams);
    pay.reset();
    await pay.createPreviewOrder(payParams);
    setCurrPayParams(payParams);
    setIsDepositFlow(payParams.toUnits == null);
  };

  const generatePreviewOrder = async () => {
    pay.reset();
    if (currPayParams == null) return;
    await pay.createPreviewOrder(currPayParams);
  };

  const resetOrder = useCallback(
    async (payParams?: Partial<PayParams>) => {
      const mergedPayParams: PayParams | undefined =
        payParams != null && currPayParams != null
          ? { ...currPayParams, ...payParams }
          : currPayParams;

      // Clear the old order & state
      pay.reset();
      setSelectedExternalOption(undefined);
      setSelectedTokenOption(undefined);
      setSelectedSolanaTokenOption(undefined);
      setSelectedStellarTokenOption(undefined);
      setSelectedDepositAddressOption(undefined);
      setSelectedWallet(undefined);
      setSelectedWalletDeepLink(undefined);
      setPaymentWaitingMessage(undefined);

      // Set the new payParams
      if (mergedPayParams) {
        await pay.createPreviewOrder(mergedPayParams);
        setCurrPayParams(mergedPayParams);
        setIsDepositFlow(mergedPayParams.toUnits == null);
      }

      setRoute(ROUTES.SELECT_METHOD);
    },
    [setRoute, pay, currPayParams]
  );

  const orderUsdAmount = useMemo(() => {
    return !isDepositFlow ? Number(currPayParams?.toUnits) : undefined;
  }, [isDepositFlow, currPayParams]);

  return {
    buttonProps,
    setButtonProps,
    connectedWalletOnly,
    setConnectedWalletOnly,
    setPayId,
    setPayParams,
    payParams: currPayParams,
    tokenMode,
    setTokenMode,
    generatePreviewOrder,
    isDepositFlow,
    paymentWaitingMessage,
    selectedExternalOption,
    selectedTokenOption,
    selectedSolanaTokenOption,
    selectedStellarTokenOption,
    showSolanaPaymentMethod,
    showStellarPaymentMethod,
    selectedWallet,
    paymentOptions,
    externalPaymentOptions,
    selectedWalletDeepLink,
    walletPaymentOptions,
    solanaPaymentOptions,
    stellarPaymentOptions,
    depositAddressOptions,
    selectedDepositAddressOption,
    createPayment: handleCreateRozoPayment,
    getOrderUsdLimit,
    resetOrder,
    setSelectedWallet,
    setSelectedWalletDeepLink,
    setPaymentWaitingMessage,
    setSelectedExternalOption,
    setSelectedTokenOption,
    setSelectedSolanaTokenOption,
    setSelectedStellarTokenOption,
    setSelectedDepositAddressOption,
    setChosenUsd,
    payWithToken,
    payWithExternal,
    payWithDepositAddress,
    payWithSolanaToken,
    payWithSolanaTokenRozo,
    payWithStellarToken,
    openInWalletBrowser,
    senderEnsName: senderEnsName ?? undefined,
    txHash,
    setTxHash,
    setRozoPaymentId,
    rozoPaymentId,
    ethWalletAddress,
    solanaPubKey,
    stellarPubKey,
    orderUsdAmount,
  };
}
