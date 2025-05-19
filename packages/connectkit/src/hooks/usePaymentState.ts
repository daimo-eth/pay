import {
  assert,
  assertNotNull,
  DaimoPayOrder,
  DaimoPayOrderWithOrg,
  DaimoPayUserMetadata,
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  DepositAddressPaymentOptions,
  ethereum,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
  ExternalPaymentOptionsString,
  getOrderDestChainId,
  isCCTPV1Chain,
  PlatformType,
  readDaimoPayOrderID,
  SolanaPublicKey,
  WalletPaymentOption,
  writeDaimoPayOrderID,
} from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Address, formatUnits, Hex, parseUnits } from "viem";
import { useAccount, useEnsName } from "wagmi";

import { PayButtonPaymentProps } from "../components/DaimoPayButton";
import { ROUTES } from "../constants/routes";
import { detectPlatform } from "../utils/platform";
import { TrpcClient } from "../utils/trpc";
import { WalletConfigProps } from "../wallets/walletConfigs";
import { useDepositAddressOptions } from "./useDepositAddressOptions";
import { useExternalPaymentOptions } from "./useExternalPaymentOptions";
import useIsMobile from "./useIsMobile";
import { useOrderUsdLimits } from "./useOrderUsdLimits";
import { usePayWithSolanaToken } from "./usePayWithSolanaToken";
import { usePayWithToken } from "./usePayWithToken";
import { useSolanaPaymentOptions } from "./useSolanaPaymentOptions";
import { useWalletPaymentOptions } from "./useWalletPaymentOptions";

/** Wallet payment details, sent to processSourcePayment after submitting tx. */
export type SourcePayment = Parameters<
  TrpcClient["processSourcePayment"]["mutate"]
>[0];

/** Payment parameters. The payment is created only after user taps pay. */
export interface PayParams {
  /** App ID, for authentication. */
  appId: string;
  /** Destination chain ID. */
  toChain: number;
  /** The destination token to send. */
  toToken: Address;
  /**
   * The amount of the token to send.
   * If not provided, the user will be prompted to enter an amount.
   */
  toUnits?: string;
  /** The final address to transfer to or contract to call. */
  toAddress: Address;
  /** Calldata for final call, or empty data for transfer. */
  toCallData?: Hex;
  /** The intent verb, such as Pay, Deposit, or Purchase. Default: Pay */
  intent?: string;
  /** Payment options. By default, all are enabled. */
  paymentOptions?: ExternalPaymentOptionsString[];
  /** Preferred chain IDs. */
  preferredChains?: number[];
  /** Preferred tokens. These appear first in the token list. */
  preferredTokens?: { chain: number; address: Address }[];
  /** Only allow payments on these EVM chains. */
  evmChains?: number[];
  /** External ID. E.g. a correlation ID. */
  externalId?: string;
  /** Developer metadata. E.g. correlation ID. */
  metadata?: DaimoPayUserMetadata;
  /** The address to refund to if the payment bounces or a refund is requested. */
  refundAddress?: Address;
}

/** Creates (or loads) a payment and manages the corresponding modal. */
export interface PaymentState {
  generatePreviewOrder: (payParams: PayParams) => void;
  resetOrder: () => void;

  /// DaimoPayButton props
  buttonProps: PayButtonPaymentProps | undefined;
  setButtonProps: (props: PayButtonPaymentProps | undefined) => void;

  /// Pay ID for loading an existing order
  setPayId: (id: string | undefined) => void;
  /// Pay params for creating an order on the fly,
  payParams: PayParams | undefined;
  setPayParams: (payParams: PayParams | undefined) => void;

  /// Hydrated order (loaded or created), or undefined (before).
  daimoPayOrder: DaimoPayOrderWithOrg | undefined;
  /// True if the user is entering an amount (deposit) vs preset (checkout).
  isDepositFlow: boolean;
  paymentWaitingMessage: string | undefined;
  /// External payment options, loaded from server and filtered by EITHER
  /// 1. the DaimoPayButton paymentOptions, or 2. those of daimoPayOrder
  externalPaymentOptions: ReturnType<typeof useExternalPaymentOptions>;
  selectedWallet: WalletConfigProps | undefined;
  selectedWalletDeepLink: string | undefined;
  showSolanaPaymentMethod: boolean;
  walletPaymentOptions: ReturnType<typeof useWalletPaymentOptions>;
  solanaPaymentOptions: ReturnType<typeof useSolanaPaymentOptions>;
  depositAddressOptions: ReturnType<typeof useDepositAddressOptions>;
  selectedExternalOption: ExternalPaymentOptionMetadata | undefined;
  selectedTokenOption: WalletPaymentOption | undefined;
  selectedSolanaTokenOption: WalletPaymentOption | undefined;
  selectedDepositAddressOption: DepositAddressPaymentOptionMetadata | undefined;
  getOrderUsdLimit: () => number;
  setPaymentWaitingMessage: (message: string | undefined) => void;
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
  payWithToken: (walletOption: WalletPaymentOption) => Promise<void>;
  payWithExternal: (option: ExternalPaymentOptions) => Promise<string>;
  payWithDepositAddress: (
    option: DepositAddressPaymentOptions,
  ) => Promise<DepositAddressPaymentOptionData | null>;
  payWithSolanaToken: (
    inputToken: SolanaPublicKey,
  ) => Promise<string | undefined>;
  payWithWallet: (
    wallet?: WalletConfigProps,
    amountUsd?: number,
  ) => Promise<void>;
  refreshOrder: () => Promise<void>;
  senderEnsName: string | undefined;
}

export function usePaymentState({
  trpc,
  lockPayParams,
  daimoPayOrder,
  setDaimoPayOrder,
  setRoute,
  log,
  redirectReturnUrl,
}: {
  trpc: TrpcClient;
  lockPayParams: boolean;
  daimoPayOrder: DaimoPayOrderWithOrg | undefined;
  setDaimoPayOrder: (o: DaimoPayOrderWithOrg | undefined) => void;
  setRoute: (route: ROUTES, data?: Record<string, any>) => void;
  log: (...args: any[]) => void;
  redirectReturnUrl?: string;
}): PaymentState {
  // Browser state.
  const [platform, setPlatform] = useState<PlatformType>();
  useEffect(() => {
    setPlatform(detectPlatform(window.navigator.userAgent));
  }, []);

  // Wallet state.
  const { address: senderAddr } = useAccount();
  const { data: senderEnsName } = useEnsName({
    chainId: ethereum.chainId,
    address: senderAddr,
  });

  // Solana wallet state.
  const solanaWallet = useWallet();
  const solanaPubKey = solanaWallet.publicKey?.toBase58();

  // TODO: backend should determine whether to show solana payment method
  const paymentOptions = daimoPayOrder?.metadata.payer?.paymentOptions;
  // Include by default if paymentOptions not provided. Solana bridging is only
  // supported on CCTP v1 chains.
  const showSolanaPaymentMethod =
    (paymentOptions == null ||
      paymentOptions.includes(ExternalPaymentOptions.Solana)) &&
    daimoPayOrder != null &&
    isCCTPV1Chain(getOrderDestChainId(daimoPayOrder));

  // Refs the survive re-renders and stores any updated param values while
  // lockPayParams is true
  const latestPayParamsRef = useRef<PayParams | undefined>();
  const latestPayIdRef = useRef<string | undefined>();

  // From DaimoPayButton props
  const [buttonProps, setButtonProps] = useState<PayButtonPaymentProps>();
  const [payParams, setPayParamsState] = useState<PayParams>();

  const [paymentWaitingMessage, setPaymentWaitingMessage] = useState<string>();
  const [isDepositFlow, setIsDepositFlow] = useState<boolean>(false);

  // UI state. Selection for external payment (Binance, etc) vs wallet payment.
  const externalPaymentOptions = useExternalPaymentOptions({
    trpc,
    // allow <DaimoPayButton payId={...} paymentOptions={override} />
    filterIds:
      buttonProps?.paymentOptions ??
      daimoPayOrder?.metadata.payer?.paymentOptions,
    platform,
    usdRequired: daimoPayOrder?.destFinalCallTokenAmount.usd,
    mode: daimoPayOrder?.mode,
  });
  const walletPaymentOptions = useWalletPaymentOptions({
    trpc,
    address: senderAddr,
    usdRequired: daimoPayOrder?.destFinalCallTokenAmount.usd,
    destChainId: daimoPayOrder?.destFinalCallTokenAmount.token.chainId,
    preferredChains: daimoPayOrder?.metadata.payer?.preferredChains,
    preferredTokens: daimoPayOrder?.metadata.payer?.preferredTokens,
    evmChains: daimoPayOrder?.metadata.payer?.evmChains,
    isDepositFlow,
    log,
  });
  const solanaPaymentOptions = useSolanaPaymentOptions({
    trpc,
    address: solanaPubKey,
    usdRequired: daimoPayOrder?.destFinalCallTokenAmount.usd,
    isDepositFlow,
  });
  const depositAddressOptions = useDepositAddressOptions({
    trpc,
    usdRequired: daimoPayOrder?.destFinalCallTokenAmount.usd,
    mode: daimoPayOrder?.mode,
  });

  const chainOrderUsdLimits = useOrderUsdLimits({ trpc });

  /** Create a new order or hydrate an existing one. */
  const createOrHydrate = async ({
    order,
    refundAddress,
    externalPaymentOption,
  }: {
    order: DaimoPayOrder;
    refundAddress?: string;
    externalPaymentOption?: ExternalPaymentOptions;
  }) => {
    assert(!!platform, "[CREATE/HYDRATE] missing platform");

    if (payParams == null) {
      log(`[CREATE/HYDRATE] hydrating existing order ${order.id}`);
      return await trpc.hydrateOrder.query({
        id: order.id.toString(),
        chosenFinalTokenAmount: order.destFinalCallTokenAmount.amount,
        platform,
        refundAddress,
        externalPaymentOption,
        redirectReturnUrl,
      });
    }

    log(`[CREATE/HYDRATE] creating+hydrating new order ${order.id}`);
    // Update units, if isDepositFlow then the user may have changed the amount.
    const toUnits = formatUnits(
      BigInt(order.destFinalCallTokenAmount.amount),
      order.destFinalCallTokenAmount.token.decimals,
    );
    return await trpc.createOrder.mutate({
      appId: payParams.appId,
      paymentInput: {
        ...payParams,
        id: order.id.toString(),
        toUnits,
        metadata: order.metadata,
        userMetadata: payParams.metadata,
        isAmountEditable: isDepositFlow,
      },
      platform,
      refundAddress,
      externalPaymentOption,
      redirectReturnUrl,
    });
  };

  const { payWithToken } = usePayWithToken({
    trpc,
    senderAddr,
    refundAddress: payParams?.refundAddress,
    daimoPayOrder,
    setDaimoPayOrder,
    createOrHydrate,
    log,
  });

  const { payWithSolanaToken } = usePayWithSolanaToken({
    trpc,
    refundAddress: payParams?.refundAddress,
    daimoPayOrder,
    setDaimoPayOrder,
    createOrHydrate,
    log,
  });

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
    const DEFAULT_USD_LIMIT = 20000;
    if (daimoPayOrder == null || chainOrderUsdLimits.loading) {
      return DEFAULT_USD_LIMIT;
    }
    const destChainId = daimoPayOrder.destFinalCallTokenAmount.token.chainId;
    return destChainId in chainOrderUsdLimits.limits
      ? chainOrderUsdLimits.limits[destChainId]
      : DEFAULT_USD_LIMIT;
  };

  const payWithExternal = async (option: ExternalPaymentOptions) => {
    assert(!!daimoPayOrder, "[PAY EXTERNAL] daimoPayOrder cannot be null");
    assert(!!platform, "[PAY EXTERNAL] platform cannot be null");
    const { hydratedOrder, externalPaymentOptionData } = await createOrHydrate({
      order: daimoPayOrder,
      refundAddress: payParams?.refundAddress,
      externalPaymentOption: option,
    });
    assert(
      !!externalPaymentOptionData,
      "[PAY EXTERNAL] missing externalPaymentOptionData",
    );

    log(
      `[PAY EXTERNAL] hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, checking out with external payment: ${option}`,
    );

    setPaymentWaitingMessage(externalPaymentOptionData.waitingMessage);
    setDaimoPayOrder(hydratedOrder);

    return externalPaymentOptionData.url;
  };

  const payWithDepositAddress = async (
    option: DepositAddressPaymentOptions,
  ) => {
    assert(!!daimoPayOrder, "[PAY DEPOSIT ADDRESS] missing daimoPayOrder");
    const { hydratedOrder } = await createOrHydrate({
      order: daimoPayOrder,
      refundAddress: payParams?.refundAddress,
    });
    setDaimoPayOrder(hydratedOrder);

    log(
      `[PAY DEPOSIT ADDRESS] hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, checking out with deposit address: ${option}`,
    );

    const depositAddressOption = await trpc.getDepositAddressOptionData.query({
      input: option,
      usdRequired: daimoPayOrder.destFinalCallTokenAmount.usd,
      toAddress: assertNotNull(
        hydratedOrder.intentAddr,
        `[PAY DEPOSIT ADDRESS] missing intentAddr on order ${hydratedOrder.id}`,
      ),
    });
    return depositAddressOption;
  };

  const { isIOS } = useIsMobile();
  /// Hydrates an order to prepare for paying in an in-wallet browser via
  /// deeplink. Then, if wallet is specified, opens in that wallet.
  const payWithWallet = async (
    wallet?: WalletConfigProps,
    amountUsd?: number,
  ) => {
    if (daimoPayOrder == null) return;

    // In deposit mode, set the amount
    let order = daimoPayOrder;
    if (amountUsd != null) {
      assert(amountUsd > 0, "amount must be positive");
      order = setChosenUsd(amountUsd);
    }

    // Hydrate the order
    log(
      `payWithWallet: hydrating order ${order.id}${amountUsd && ` for $${amountUsd}`}`,
    );
    const { hydratedOrder } = await createOrHydrate({
      order,
      refundAddress: payParams?.refundAddress,
    });
    setDaimoPayOrder(hydratedOrder);

    // If we already picked a wallet, open in that wallet.
    if (wallet == null) return;
    assert(
      wallet.getDaimoPayDeeplink != null,
      "payWithWallet: missing deeplink",
    );
    const payId = writeDaimoPayOrderID(hydratedOrder.id);
    const deeplink = wallet.getDaimoPayDeeplink(payId);
    // if we are in IOS, we don't open the deeplink in a new window, because it will not work, the link will be opened in the page WAITING_WALLET
    if (!isIOS) {
      window.open(deeplink, "_blank");
    }
    setSelectedWalletDeepLink(deeplink);
    setRoute(ROUTES.WAITING_WALLET, {
      amountUsd,
      payId,
      wallet_name: wallet.name,
    });
  };

  const refreshOrder = useCallback(async () => {
    const id = daimoPayOrder?.id?.toString();
    if (!id) return;

    const { order } = await trpc.getOrder.query({
      id,
    });

    // Don't overwrite the order if a new order was generated.
    if (daimoPayOrder == null || order.id === daimoPayOrder.id) {
      log(`[CHECKOUT] refreshed order: ${order.id}`);
      setDaimoPayOrder(order);
    } else {
      log(
        `[CHECKOUT] IGNORING refreshOrder, wrong ID: ${order.id} vs ${daimoPayOrder.id}`,
      );
    }
  }, [daimoPayOrder, trpc, setDaimoPayOrder, log]);

  /** User picked a different deposit amount. */
  const setChosenUsd = (usd: number) => {
    assert(!!daimoPayOrder, "[SET CHOSEN USD] daimoPayOrder cannot be null");
    const token = daimoPayOrder.destFinalCallTokenAmount.token;
    const tokenUnits = (usd / token.priceFromUsd).toString();
    const tokenAmount = parseUnits(tokenUnits, token.decimals);

    // TODO: remove amount from destFinalCall, it is redundant with
    // destFinalCallTokenAmount. Here, we only modify one and not the other.
    log(`[CHECKOUT] chose USD amount $${usd} = ${tokenUnits} ${token.symbol}`);
    const ret = {
      ...daimoPayOrder,
      destFinalCallTokenAmount: {
        token,
        amount: tokenAmount.toString() as `${bigint}`,
        usd: usd,
      },
    };
    setDaimoPayOrder(ret);
    return ret;
  };

  const setPayId = useCallback(
    async (payId: string | undefined) => {
      latestPayIdRef.current = payId;

      if (lockPayParams || !payId) return;
      const id = readDaimoPayOrderID(payId).toString();

      if (daimoPayOrder && BigInt(id) == daimoPayOrder.id) {
        // Already loaded, ignore.
        return;
      }

      const { order } = await trpc.getOrder.query({ id });
      if (!order) {
        console.error(`[CHECKOUT] setPayId: no order found for ${payId}`);
        return;
      }
      log(`[CHECKOUT] setPayId: fetched order: ${JSON.stringify(order)}`);

      setDaimoPayOrder(order);
    },
    [daimoPayOrder, lockPayParams, trpc, log, setDaimoPayOrder],
  );

  /** Called whenever params change. */
  const setPayParams = async (payParams: PayParams | undefined) => {
    latestPayParamsRef.current = payParams;

    if (lockPayParams) return;
    assert(payParams != null, "[SET PAY PARAMS] payParams cannot be null");

    console.log("[SET PAY PARAMS] setting payParams");
    setPayParamsState(payParams);
    setIsDepositFlow(payParams.toUnits == null);

    generatePreviewOrder(payParams);
  };

  const generatePreviewOrder = useCallback(
    async (payParams: PayParams) => {
      // toUnits is undefined if and only if we're in deposit flow.
      // Set dummy value for deposit flow, since user can edit the amount.
      const toUnits = payParams.toUnits == null ? "0" : payParams.toUnits;

      const orderPreview = await trpc.previewOrder.query({
        appId: payParams.appId,
        toChain: payParams.toChain,
        toToken: payParams.toToken,
        toUnits,
        toAddress: payParams.toAddress,
        toCallData: payParams.toCallData,
        isAmountEditable: payParams.toUnits == null,
        metadata: {
          intent: payParams.intent ?? "Pay",
          items: [],
          payer: {
            paymentOptions: payParams.paymentOptions,
            preferredChains: payParams.preferredChains,
            preferredTokens: payParams.preferredTokens,
            evmChains: payParams.evmChains,
          },
        },
        externalId: payParams.externalId,
        userMetadata: payParams.metadata,
        refundAddress: payParams.refundAddress,
      });

      log(`[CHECKOUT] generated preview: ${JSON.stringify(orderPreview)}`);
      // TODO: Properly type this and fix hacky type casting
      setDaimoPayOrder(orderPreview as unknown as DaimoPayOrderWithOrg);
    },
    [trpc, log, setDaimoPayOrder],
  );

  const resetOrder = useCallback(() => {
    // Clear the old order & UI
    setDaimoPayOrder(undefined);
    setRoute(ROUTES.SELECT_METHOD);

    // Prefer an explicit payId, otherwise use the queued payParams
    if (latestPayIdRef.current) {
      setPayId(latestPayIdRef.current);
      latestPayIdRef.current = undefined;
    } else if (latestPayParamsRef.current) {
      const p = latestPayParamsRef.current;
      setPayParamsState(p);
      generatePreviewOrder(p);
    }
  }, [
    setDaimoPayOrder,
    setRoute,
    setPayId,
    setPayParamsState,
    generatePreviewOrder,
  ]);

  return {
    buttonProps,
    setButtonProps,
    setPayId,
    payParams,
    setPayParams,

    generatePreviewOrder,
    daimoPayOrder,
    isDepositFlow,
    paymentWaitingMessage,
    selectedExternalOption,
    selectedTokenOption,
    selectedSolanaTokenOption,
    externalPaymentOptions,
    showSolanaPaymentMethod,
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
    payWithWallet,
    refreshOrder,
    senderEnsName: senderEnsName ?? undefined,
  };
}
