import {
  assert,
  assertNotNull,
  DaimoPayHydratedOrderWithOrg,
  debugJson,
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  DepositAddressPaymentOptions,
  ethereum,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  ExternalPaymentOptionsString,
  isNativeToken,
  PlatformType,
  readDaimoPayOrderID,
  SolanaPublicKey,
  WalletPaymentOption,
  writeDaimoPayOrderID,
} from "@daimo/pay-common";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { erc20Abi, getAddress, Hex, hexToBytes, isHex } from "viem";
import {
  useAccount,
  useEnsName,
  useSendTransaction,
  useWriteContract,
} from "wagmi";

import { PayButtonPaymentProps } from "../components/DaimoPayButton";
import { DEFAULT_USD_LIMIT } from "../constants/limits";
import {
  DEFAULT_TOP_OPTIONS_ORDER,
  inferTopLevelFromArray,
  TOP_LEVEL_PAYMENT_OPTIONS,
} from "../constants/paymentOptions";
import { ROUTES } from "../constants/routes";
import { PayParams } from "../payment/paymentFsm";
import { detectPlatform } from "../utils/platform";
import { TrpcClient } from "../utils/trpc";
import { WalletConfigProps } from "../wallets/walletConfigs";
import { useDaimoPay } from "./useDaimoPay";
import { useDepositAddressOptions } from "./useDepositAddressOptions";
import { useExternalPaymentOptions } from "./useExternalPaymentOptions";
import useIsMobile from "./useIsMobile";
import { useOrderUsdLimits } from "./useOrderUsdLimits";
import { useSolanaPaymentOptions } from "./useSolanaPaymentOptions";
import { useUntronAvailability } from "./useUntronAvailability";
import { useWalletPaymentOptions } from "./useWalletPaymentOptions";

/** Wallet payment details, sent to processSourcePayment after submitting tx. */
export type SourcePayment = Parameters<
  TrpcClient["processSourcePayment"]["mutate"]
>[0];

/**
 * Extract the ordered list of top-level options from paymentOptions.
 * Returns an empty list if none are provided. Throws if top-level and
 * specific options are mixed.
 */
function getTopLevelOptions(
  paymentOptions: (string | string[])[] | undefined,
): ExternalPaymentOptionsString[] {
  if (!paymentOptions || paymentOptions.length === 0) return [];

  const topLevelOptions = TOP_LEVEL_PAYMENT_OPTIONS;
  const isString = (opt: unknown): opt is string => typeof opt === "string";

  const stringOptions = paymentOptions.filter(isString);
  const topLevel = stringOptions.filter((opt) =>
    topLevelOptions.includes(opt as ExternalPaymentOptionsString),
  );
  const specific = stringOptions.filter(
    (opt) => !topLevelOptions.includes(opt as ExternalPaymentOptionsString),
  );

  if (topLevel.length && specific.length) {
    throw new Error(
      `invalid paymentOptions: cannot mix top-level options ${JSON.stringify(topLevel)} with specific options ${JSON.stringify(specific)}. ` +
        `use either ["AllWallets", "AllExchanges", ...] or ["MiniPay", "Binance", ...], not both`,
    );
  }

  // Flatten nested arrays and infer a top-level entry when needed
  const flattened = paymentOptions.map((opt) =>
    Array.isArray(opt)
      ? (inferTopLevelFromArray(opt as string[]) ?? "AllWallets")
      : opt,
  );

  // Keep only top-level options, preserving order
  return flattened.filter((opt) =>
    topLevelOptions.includes(opt as ExternalPaymentOptionsString),
  ) as ExternalPaymentOptionsString[];
}

/** Creates (or loads) a payment and manages the corresponding modal. */
export interface PaymentState {
  generatePreviewOrder: () => void;
  resetOrder: (payParams?: Partial<PayParams>) => Promise<void>;

  /// DaimoPayButton props
  buttonProps: PayButtonPaymentProps | undefined;
  setButtonProps: (props: PayButtonPaymentProps | undefined) => void;
  /// Order of top-level payment options in SelectMethod
  topOptionsOrder: string[];

  /// Pay ID for loading an existing order
  setPayId: (id: string | undefined) => Promise<void>;
  /// Pay params for creating an order on the fly,
  setPayParams: (payParams: PayParams | undefined) => Promise<void>;

  /// True if the user is entering an amount (deposit) vs preset (checkout).
  isDepositFlow: boolean;
  paymentWaitingMessage: string | undefined;
  /// External payment options, loaded from server and filtered by EITHER
  /// 1. the DaimoPayButton paymentOptions, or 2. those of daimoPayOrder
  externalPaymentOptions: ReturnType<typeof useExternalPaymentOptions>;
  selectedWallet: WalletConfigProps | undefined;
  selectedWalletDeepLink: string | undefined;
  walletPaymentOptions: ReturnType<typeof useWalletPaymentOptions>;
  solanaPaymentOptions: ReturnType<typeof useSolanaPaymentOptions>;
  depositAddressOptions: ReturnType<typeof useDepositAddressOptions>;
  /** Whether Untron receivers are currently available. `null` when unknown. */
  untronAvailable: boolean | null;
  selectedExternalOption: ExternalPaymentOptionMetadata | undefined;
  selectedTokenOption: WalletPaymentOption | undefined;
  selectedSolanaTokenOption: WalletPaymentOption | undefined;
  selectedDepositAddressOption: DepositAddressPaymentOptionMetadata | undefined;
  getOrderUsdLimit: () => number;
  setPaymentWaitingMessage: (message: string | undefined) => void;
  tokenMode: "evm" | "solana" | "all";
  setTokenMode: (mode: "evm" | "solana" | "all") => void;
  setSelectedWallet: (wallet: WalletConfigProps | undefined) => void;
  setSelectedWalletDeepLink: (deepLink: string | undefined) => void;
  setSelectedExternalOption: (
    option: ExternalPaymentOptionMetadata | undefined,
  ) => void;
  setSelectedTokenOption: (option: WalletPaymentOption | undefined) => void;
  setSelectedSolanaTokenOption: (
    option: WalletPaymentOption | undefined,
  ) => void;
  setSelectedDepositAddressOption: (
    option: DepositAddressPaymentOptionMetadata | undefined,
  ) => void;
  setChosenUsd: (usd: number) => void;
  payWithToken: (
    walletOption: WalletPaymentOption,
  ) => Promise<{ txHash?: Hex; success: boolean }>;
  payWithExternal: (option: ExternalPaymentOptions) => Promise<string>;
  payWithDepositAddress: (
    option: DepositAddressPaymentOptions,
  ) => Promise<DepositAddressPaymentOptionData | null>;
  payWithSolanaToken: (
    inputToken: SolanaPublicKey,
  ) => Promise<{ txHash: string; success: boolean }>;
  openInWalletBrowser: (
    wallet: WalletConfigProps,
    amountUsd?: number,
  ) => Promise<void>;
  senderEnsName: string | undefined;
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
  const pay = useDaimoPay();

  // Browser state.
  const [platform, setPlatform] = useState<PlatformType>();
  useEffect(() => {
    setPlatform(detectPlatform(window.navigator.userAgent));
  }, []);

  // Wallet state.
  const { address: ethWalletAddress } = useAccount();
  const { data: senderEnsName } = useEnsName({
    chainId: ethereum.chainId,
    address: ethWalletAddress,
  });
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  // Solana wallet state.
  const solanaWallet = useWallet();
  const { connection } = useConnection();
  const solanaPubKey = solanaWallet.publicKey?.toBase58();

  // From DaimoPayButton props
  const [buttonProps, setButtonProps] = useState<PayButtonPaymentProps>();
  const [currPayParams, setCurrPayParams] = useState<PayParams>();

  const [paymentWaitingMessage, setPaymentWaitingMessage] = useState<string>();
  const [isDepositFlow, setIsDepositFlow] = useState<boolean>(false);

  // UI state. Selection for external payment (Binance, etc) vs wallet payment.
  const externalPaymentOptions = useExternalPaymentOptions({
    trpc,
    // allow <DaimoPayButton payId={...} paymentOptions={override} />
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
    destAddress: pay.order?.destFinalCall.to,
    preferredChains: pay.order?.metadata.payer?.preferredChains,
    preferredTokens: pay.order?.metadata.payer?.preferredTokens,
    evmChains: pay.order?.metadata.payer?.evmChains,
    passthroughTokens: pay.order?.metadata.payer?.passthroughTokens,
    isDepositFlow,
    log,
  });
  const solanaPaymentOptions = useSolanaPaymentOptions({
    trpc,
    address: solanaPubKey,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    isDepositFlow,
  });
  const depositAddressOptions = useDepositAddressOptions({
    trpc,
    usdRequired: pay.order?.destFinalCallTokenAmount.usd,
    mode: pay.order?.mode,
  });

  // Poll for Untron receiver availability so components can disable unsupported chains promptly.
  const { available: untronAvailable } = useUntronAvailability({ trpc });

  const chainOrderUsdLimits = useOrderUsdLimits({ trpc });

  const [selectedExternalOption, setSelectedExternalOption] =
    useState<ExternalPaymentOptionMetadata>();

  const [selectedTokenOption, setSelectedTokenOption] =
    useState<WalletPaymentOption>();

  const [selectedSolanaTokenOption, setSelectedSolanaTokenOption] =
    useState<WalletPaymentOption>();

  const [selectedDepositAddressOption, setSelectedDepositAddressOption] =
    useState<DepositAddressPaymentOptionMetadata>();

  const [selectedWallet, setSelectedWallet] = useState<WalletConfigProps>();
  const [selectedWalletDeepLink, setSelectedWalletDeepLink] =
    useState<string>();

  const getOrderUsdLimit = () => {
    if (pay.order == null || chainOrderUsdLimits.loading) {
      return DEFAULT_USD_LIMIT;
    }
    const destChainId = pay.order.destFinalCallTokenAmount.token.chainId;
    return destChainId in chainOrderUsdLimits.limits
      ? chainOrderUsdLimits.limits[destChainId]
      : DEFAULT_USD_LIMIT;
  };

  /** Commit to a token + amount = initiate payment. */
  const payWithToken = async (
    walletOption: WalletPaymentOption,
  ): Promise<{ txHash?: Hex; success: boolean }> => {
    assert(
      ethWalletAddress != null,
      `[PAY TOKEN] null ethWalletAddress when paying on ethereum`,
    );
    assert(
      pay.paymentState === "preview" ||
        pay.paymentState === "unhydrated" ||
        pay.paymentState === "payment_unpaid",
      `[PAY TOKEN] paymentState is ${pay.paymentState}, must be preview or unhydrated or payment_unpaid`,
    );

    let hydratedOrder: DaimoPayHydratedOrderWithOrg;
    const { required, fees } = walletOption;
    const paymentAmount = BigInt(required.amount) + BigInt(fees.amount);
    if (pay.paymentState !== "payment_unpaid") {
      assert(
        required.token.token === fees.token.token,
        `[PAY TOKEN] required token ${debugJson(required)} does not match fees token ${debugJson(fees)}`,
      );

      // Will refund to ethWalletAddress if refundAddress was not set in payParams
      const res = await pay.hydrateOrder(ethWalletAddress);
      hydratedOrder = res.order;

      log(
        `[PAY TOKEN] hydrated order: ${debugJson(
          hydratedOrder,
        )}, paying ${paymentAmount} of token ${required.token.token}`,
      );
    } else {
      hydratedOrder = pay.order;
    }

    const paymentTxHash = await (async () => {
      const dest = walletOption.passthroughAddress ?? hydratedOrder.intentAddr;
      try {
        if (isNativeToken(getAddress(required.token.token))) {
          return await sendTransactionAsync({
            to: dest,
            value: paymentAmount,
          });
        } else {
          return await writeContractAsync({
            abi: erc20Abi,
            address: getAddress(required.token.token),
            functionName: "transfer",
            args: [dest, paymentAmount],
          });
        }
      } catch (e) {
        console.error(`[PAY TOKEN] error sending token: ${e}`);
        throw e;
      }
    })();

    // Special case. Handle Rabby bug, where it returns the *Safe signature*
    // instead of a txHash for a queued, unsubmitted Safe transaction.
    if (!isHex(paymentTxHash) || paymentTxHash.length !== 66) {
      log(
        `[PAY TOKEN] wallet bug detected. ignoring invalid payment txHash: ${paymentTxHash}`,
      );
      return { success: true };
    }

    try {
      await pay.payEthSource({
        paymentTxHash,
        sourceChainId: required.token.chainId,
        payerAddress: ethWalletAddress,
        sourceToken: getAddress(required.token.token),
        sourceAmount: paymentAmount,
      });
      return { txHash: paymentTxHash, success: true };
    } catch {
      console.error(
        `[PAY TOKEN] could not verify payment tx on chain: ${paymentTxHash}`,
      );
      return { txHash: paymentTxHash, success: false };
    }
  };

  const payWithSolanaToken = async (
    inputToken: SolanaPublicKey,
  ): Promise<{ txHash: string; success: boolean }> => {
    const payerPublicKey = solanaWallet.publicKey;
    assert(
      payerPublicKey != null,
      "[PAY SOLANA] null payerPublicKey when paying on solana",
    );
    assert(
      pay.order?.id != null,
      "[PAY SOLANA] null orderId when paying on solana",
    );
    assert(
      pay.paymentState === "preview" ||
        pay.paymentState === "unhydrated" ||
        pay.paymentState === "payment_unpaid",
      `[PAY SOLANA] paymentState is ${pay.paymentState}, must be preview or unhydrated or payment_unpaid`,
    );

    let hydratedOrder: DaimoPayHydratedOrderWithOrg;
    if (pay.paymentState !== "payment_unpaid") {
      const res = await pay.hydrateOrder();
      hydratedOrder = res.order;

      log(
        `[PAY SOLANA] Hydrated order: ${JSON.stringify(
          hydratedOrder,
        )}, checking out with Solana ${inputToken}`,
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
            "[PAY SOLANA] wallet.publicKey cannot be null",
          ).toString(),
          inputTokenMint: inputToken,
        });
        const tx = VersionedTransaction.deserialize(hexToBytes(serializedTx));
        const txHash = await solanaWallet.sendTransaction(tx, connection);
        return txHash;
      } catch (e) {
        console.error(e);
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
        `[PAY SOLANA] could not verify payment tx on chain: ${paymentTxHash}`,
      );
      return { txHash: paymentTxHash, success: false };
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
      "[PAY EXTERNAL] missing externalPaymentOptionData",
    );

    log(
      `[PAY EXTERNAL] hydrated order: ${debugJson(
        order,
      )}, checking out with external payment: ${option}`,
    );

    setPaymentWaitingMessage(externalPaymentOptionData.waitingMessage);

    return externalPaymentOptionData.url;
  };

  const payWithDepositAddress = async (
    option: DepositAddressPaymentOptions,
  ) => {
    const { order } = await pay.hydrateOrder();

    log(
      `[PAY DEPOSIT ADDRESS] hydrated order ${order.id} for ${order.usdValue} USD, checking out with deposit address: ${option}`,
    );

    const result = await trpc.getDepositAddressForOrder.query({
      orderId: order.id.toString(),
      option,
    });

    return "error" in result ? null : result;
  };

  const { isIOS, isAndroid } = useIsMobile();

  const openInWalletBrowser = async (
    wallet: WalletConfigProps,
    amountUsd?: number,
  ) => {
    const paymentState = pay.paymentState;
    assert(
      paymentState === "preview" ||
        paymentState === "unhydrated" ||
        paymentState === "payment_unpaid",
      `[OPEN IN WALLET BROWSER] paymentState is ${paymentState}, must be preview or unhydrated or payment_unpaid`,
    );
    assert(
      wallet.getDaimoPayDeeplink != null,
      `openInWalletBrowser: missing deeplink for ${wallet.name}`,
    );

    // hydrate order if not already hydrated
    if (pay.paymentState !== "payment_unpaid") {
      await pay.hydrateOrder();
    }

    const payId = writeDaimoPayOrderID(pay.order.id);
    const platform = isIOS ? "ios" : isAndroid ? "android" : "other";
    const deeplink = wallet.getDaimoPayDeeplink(payId, platform);
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
      "[SET CHOSEN USD] paymentState is not preview",
    );

    // Too expensive to make an API call to regenerate preview order each time
    // the user changes the amount. Instead, we modify the order in memory.
    pay.setChosenUsd(usd);
  };

  const setPayId = useCallback(
    async (payId: string | undefined) => {
      if (payId == null) return;
      const id = readDaimoPayOrderID(payId).toString();

      if (pay.order?.id && BigInt(id) == pay.order.id) {
        // Already loaded, ignore.
        return;
      }

      pay.reset();
      await pay.setPayId(payId);
      setIsDepositFlow(false);
    },
    [pay],
  );

  /** Called whenever params change. */
  const setPayParams = async (payParams: PayParams | undefined) => {
    if (lockPayParams) return;
    assert(payParams != null, "[SET PAY PARAMS] payParams cannot be null");

    log("[SET PAY PARAMS] setting payParams", payParams);
    pay.reset();
    setCurrPayParams(payParams);
    setIsDepositFlow(payParams.toUnits == null);
    await pay.createPreviewOrder(payParams);
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
      setSelectedDepositAddressOption(undefined);
      setSelectedWallet(undefined);
      setSelectedWalletDeepLink(undefined);
      setPaymentWaitingMessage(undefined);

      // Set the new payParams
      if (mergedPayParams) {
        setCurrPayParams(mergedPayParams);
        setIsDepositFlow(mergedPayParams.toUnits == null);
        await pay.createPreviewOrder(mergedPayParams);
      }

      setRoute(ROUTES.SELECT_METHOD);
    },
    [setRoute, pay, currPayParams],
  );

  const [tokenMode, setTokenMode] = useState<"evm" | "solana" | "all">("evm");

  // Compute the order of top-level payment options from paymentOptions
  const topOptionsOrder = (() => {
    const defaultOrder = DEFAULT_TOP_OPTIONS_ORDER;
    const paymentOptions =
      buttonProps?.paymentOptions ?? pay.order?.metadata.payer?.paymentOptions;
    const found = getTopLevelOptions(paymentOptions);
    return found.length ? found : defaultOrder;
  })();

  return {
    buttonProps,
    setButtonProps,
    topOptionsOrder,
    setPayId,
    setPayParams,
    tokenMode,
    setTokenMode,
    generatePreviewOrder,
    isDepositFlow,
    paymentWaitingMessage,
    selectedExternalOption,
    selectedTokenOption,
    selectedSolanaTokenOption,
    externalPaymentOptions,
    selectedWallet,
    selectedWalletDeepLink,
    walletPaymentOptions,
    solanaPaymentOptions,
    depositAddressOptions,
    selectedDepositAddressOption,
    getOrderUsdLimit,
    resetOrder,
    setSelectedWallet,
    setSelectedWalletDeepLink,
    setPaymentWaitingMessage,
    setSelectedExternalOption,
    setSelectedTokenOption,
    setSelectedSolanaTokenOption,
    setSelectedDepositAddressOption,
    setChosenUsd,
    payWithToken,
    payWithExternal,
    payWithDepositAddress,
    payWithSolanaToken,
    openInWalletBrowser,
    senderEnsName: senderEnsName ?? undefined,
    untronAvailable,
  };
}
