import {
  assert,
  assertNotNull,
  DaimoPayOrder,
  DaimoPayUserMetadata,
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
} from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { Address, formatUnits, Hex, parseUnits } from "viem";
import { useAccount, useEnsName } from "wagmi";

import { DaimoPayModalOptions, PaymentOption } from "../types";
import { detectPlatform } from "../utils/platform";
import { TrpcClient } from "../utils/trpc";
import { useDepositAddressOptions } from "./useDepositAddressOptions";
import { useExternalPaymentOptions } from "./useExternalPaymentOptions";
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
  paymentOptions?: PaymentOption[];
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
  setPayId: (id: string | undefined) => void;
  setPayParams: (payParams: PayParams | undefined) => void;
  payParams: PayParams | undefined;
  generatePreviewOrder: (payParams: PayParams) => void;
  resetOrder: () => void;

  daimoPayOrder: DaimoPayOrder | undefined;
  isDepositFlow: boolean;
  modalOptions: DaimoPayModalOptions;
  setModalOptions: (modalOptions: DaimoPayModalOptions) => void;
  paymentWaitingMessage: string | undefined;
  externalPaymentOptions: ReturnType<typeof useExternalPaymentOptions>;
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
  refreshOrder: () => Promise<void>;
  onSuccess: (args: { txHash: string; txURL?: string }) => void;
  senderEnsName: string | undefined;
}

export function usePaymentState({
  trpc,
  daimoPayOrder,
  setDaimoPayOrder,
  setOpen,
  log,
  redirectReturnUrl,
}: {
  trpc: TrpcClient;
  daimoPayOrder: DaimoPayOrder | undefined;
  setDaimoPayOrder: (o: DaimoPayOrder | undefined) => void;
  setOpen: (showModal: boolean, meta?: Record<string, any>) => void;
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

  // Daimo Pay order state.
  const [payParams, setPayParamsState] = useState<PayParams>();
  const [paymentWaitingMessage, setPaymentWaitingMessage] = useState<string>();
  const [isDepositFlow, setIsDepositFlow] = useState<boolean>(false);

  // Payment UI config.
  const [modalOptions, setModalOptions] = useState<DaimoPayModalOptions>({});

  // UI state. Selection for external payment (Binance, etc) vs wallet payment.
  const externalPaymentOptions = useExternalPaymentOptions({
    trpc,
    filterIds: daimoPayOrder?.metadata.payer?.paymentOptions,
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
  }, [daimoPayOrder?.id]);

  /** User picked a different deposit amount. */
  const setChosenUsd = (usd: number) => {
    assert(!!daimoPayOrder, "[SET CHOSEN USD] daimoPayOrder cannot be null");
    const token = daimoPayOrder.destFinalCallTokenAmount.token;
    const tokenUnits = (usd / token.priceFromUsd).toString();
    const tokenAmount = parseUnits(tokenUnits, token.decimals);

    // TODO: remove amount from destFinalCall, it is redundant with
    // destFinalCallTokenAmount. Here, we only modify one and not the other.
    log(`[CHECKOUT] chose USD amount $${usd} = ${tokenUnits} ${token.symbol}`);
    setDaimoPayOrder({
      ...daimoPayOrder,
      destFinalCallTokenAmount: {
        token,
        amount: tokenAmount.toString() as `${bigint}`,
        usd: usd,
      },
    });
  };

  const setPayId = useCallback(
    async (payId: string | undefined) => {
      if (!payId) return;
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
    [daimoPayOrder],
  );

  /** Called whenever params change. */
  const setPayParams = async (payParams: PayParams | undefined) => {
    assert(payParams != null, "[SET PAY PARAMS] payParams cannot be null");
    setPayParamsState(payParams);
    setIsDepositFlow(payParams.toUnits == null);

    generatePreviewOrder(payParams);
  };

  const generatePreviewOrder = async (payParams: PayParams) => {
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
    setDaimoPayOrder(orderPreview);
  };

  const onSuccess = ({ txHash, txURL }: { txHash: string; txURL?: string }) => {
    if (modalOptions?.closeOnSuccess) {
      log(`[CHECKOUT] transaction succeeded, closing: ${txHash} ${txURL}`);
      setTimeout(() => setOpen(false, { event: "wait-success" }), 1000);
    }
  };

  const resetOrder = useCallback(() => {
    if (payParams == null) return;
    generatePreviewOrder(payParams);
  }, [payParams]);

  return {
    setPayId,
    payParams,
    setPayParams,
    generatePreviewOrder,
    daimoPayOrder,
    isDepositFlow,
    modalOptions,
    setModalOptions,
    paymentWaitingMessage,
    selectedExternalOption,
    selectedTokenOption,
    selectedSolanaTokenOption,
    externalPaymentOptions,
    showSolanaPaymentMethod,
    walletPaymentOptions,
    solanaPaymentOptions,
    depositAddressOptions,
    selectedDepositAddressOption,
    getOrderUsdLimit,
    resetOrder,
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
    refreshOrder,
    onSuccess,
    senderEnsName: senderEnsName ?? undefined,
  };
}
