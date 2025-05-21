import {
  assert,
  debugJson,
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  DepositAddressPaymentOptions,
  ethereum,
  ExternalPaymentOptionMetadata,
  ExternalPaymentOptions,
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
import { useAccount, useEnsName } from "wagmi";

import { PayButtonPaymentProps } from "../components/DaimoPayButton";
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
import { usePayWithSolanaToken } from "./usePayWithSolanaToken";
import { usePayWithToken } from "./usePayWithToken";
import { useSolanaPaymentOptions } from "./useSolanaPaymentOptions";
import { useWalletPaymentOptions } from "./useWalletPaymentOptions";

/** Wallet payment details, sent to processSourcePayment after submitting tx. */
export type SourcePayment = Parameters<
  TrpcClient["processSourcePayment"]["mutate"]
>[0];

/** Creates (or loads) a payment and manages the corresponding modal. */
export interface PaymentState {
  generatePreviewOrder: () => void;
  resetOrder: () => void;

  /// DaimoPayButton props
  buttonProps: PayButtonPaymentProps | undefined;
  setButtonProps: (props: PayButtonPaymentProps | undefined) => void;

  /// Pay ID for loading an existing order
  setPayId: (id: string | undefined) => void;
  /// Pay params for creating an order on the fly,
  setPayParams: (payParams: PayParams | undefined) => void;

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

  // Solana wallet state.
  const solanaWallet = useWallet();
  const solanaPubKey = solanaWallet.publicKey?.toBase58();

  // TODO: backend should determine whether to show solana payment method
  const paymentOptions = pay.order?.metadata.payer?.paymentOptions;
  // Include by default if paymentOptions not provided. Solana bridging is only
  // supported on CCTP v1 chains.
  const showSolanaPaymentMethod =
    (paymentOptions == null ||
      paymentOptions.includes(ExternalPaymentOptions.Solana)) &&
    pay.order != null &&
    isCCTPV1Chain(getOrderDestChainId(pay.order));

  // Refs the survive re-renders and stores any updated param values while
  // lockPayParams is true
  const latestPayParamsRef = useRef<PayParams | undefined>();
  const latestPayIdRef = useRef<string | undefined>();

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
    preferredChains: pay.order?.metadata.payer?.preferredChains,
    preferredTokens: pay.order?.metadata.payer?.preferredTokens,
    evmChains: pay.order?.metadata.payer?.evmChains,
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

  const chainOrderUsdLimits = useOrderUsdLimits({ trpc });

  const { payWithToken } = usePayWithToken({
    payerAddress: ethWalletAddress,
    paymentState: pay.paymentState,
    hydrateOrder: pay.hydrateOrder,
    payEthSource: pay.payEthSource,
    log,
  });

  const { payWithSolanaToken } = usePayWithSolanaToken({
    payerPublicKey: solanaWallet.publicKey,
    paymentState: pay.paymentState,
    orderId: pay.order?.id,
    hydrateOrder: pay.hydrateOrder,
    paySolanaSource: pay.paySolanaSource,
    trpc,
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
    if (pay.order == null || chainOrderUsdLimits.loading) {
      return DEFAULT_USD_LIMIT;
    }
    const destChainId = pay.order.destFinalCallTokenAmount.token.chainId;
    return destChainId in chainOrderUsdLimits.limits
      ? chainOrderUsdLimits.limits[destChainId]
      : DEFAULT_USD_LIMIT;
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
    assert(
      pay.paymentState == "payment_unpaid",
      `[PAY DEPOSIT ADDRESS] paymentState is ${pay.paymentState}, must be payment_unpaid`,
    );
    const { order: hydratedOrder } = await pay.hydrateOrder();

    log(
      `[PAY DEPOSIT ADDRESS] hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, checking out with deposit address: ${option}`,
    );

    const depositAddressOption = await trpc.getDepositAddressOptionData.query({
      input: option,
      usdRequired: hydratedOrder.destFinalCallTokenAmount.usd,
      toAddress: hydratedOrder.intentAddr,
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
    const paymentState = pay.paymentState;
    assert(
      paymentState === "preview" || paymentState === "unhydrated",
      `[PAY SOLANA] paymentState is ${paymentState}, must be preview or unhydrated`,
    );

    // In deposit mode, set the amount
    if (amountUsd != null) {
      assert(amountUsd > 0, "amount must be positive");
      setChosenUsd(amountUsd);
    }

    // TODO: pass user's connected wallet as fallback refundAddress
    const { order: hydratedOrder } = await pay.hydrateOrder();

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
      latestPayIdRef.current = payId;

      if (lockPayParams || payId == null) return;
      const id = readDaimoPayOrderID(payId).toString();

      if (pay.order?.id && BigInt(id) == pay.order.id) {
        // Already loaded, ignore.
        return;
      }

      pay.reset();
      pay.setPayId(payId);
    },
    [lockPayParams, pay],
  );

  /** Called whenever params change. */
  const setPayParams = async (payParams: PayParams | undefined) => {
    latestPayParamsRef.current = payParams;

    if (lockPayParams) return;
    assert(payParams != null, "[SET PAY PARAMS] payParams cannot be null");

    console.log("[SET PAY PARAMS] setting payParams");
    pay.reset();
    await pay.createPreviewOrder(payParams);
    setCurrPayParams(payParams);
    setIsDepositFlow(payParams.toUnits == null);
  };

  const generatePreviewOrder = async () => {
    if (currPayParams == null) return;
    pay.reset();
    await pay.createPreviewOrder(currPayParams);
  };

  const resetOrder = useCallback(() => {
    // Clear the old order & UI
    pay.reset();
    setRoute(ROUTES.SELECT_METHOD);

    // Prefer an explicit payId, otherwise use the queued payParams
    if (latestPayIdRef.current) {
      pay.setPayId(latestPayIdRef.current);
      latestPayIdRef.current = undefined;
    } else if (latestPayParamsRef.current) {
      pay.createPreviewOrder(latestPayParamsRef.current);
      latestPayParamsRef.current = undefined;
    }
  }, [setRoute, pay]);

  return {
    buttonProps,
    setButtonProps,
    setPayId,
    setPayParams,

    generatePreviewOrder,
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
    senderEnsName: senderEnsName ?? undefined,
  };
}
