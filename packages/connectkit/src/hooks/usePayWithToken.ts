import {
  assert,
  assertNotNull,
  DaimoPayOrder,
  debugJson,
  WalletPaymentOption,
} from "@daimo/pay-common";
import { Address, erc20Abi, getAddress, zeroAddress } from "viem";
import { useSendTransaction, useWriteContract } from "wagmi";
import { TrpcClient } from "../utils/trpc";
import { CreateOrHydrateFn } from "./hookTypes";

export function usePayWithToken({
  trpc,
  senderAddr,
  refundAddress,
  daimoPayOrder,
  setDaimoPayOrder,
  createOrHydrate,
  log,
}: {
  trpc: TrpcClient;
  createOrHydrate: CreateOrHydrateFn;
  senderAddr: Address | undefined;
  refundAddress: Address | undefined;
  daimoPayOrder: DaimoPayOrder | undefined;
  setDaimoPayOrder: (order: DaimoPayOrder) => void;
  log: (message: string) => void;
}) {
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  /** Commit to a token + amount = initiate payment. */
  const payWithToken = async (walletOption: WalletPaymentOption) => {
    assert(!!daimoPayOrder, "[PAY TOKEN] daimoPayOrder cannot be null");

    const { required, fees } = walletOption;
    assert(
      required.token.token === fees.token.token,
      `[PAY TOKEN] required token ${debugJson(required)} does not match fees token ${debugJson(fees)}`,
    );
    const paymentAmount = BigInt(required.amount) + BigInt(fees.amount);

    const { hydratedOrder } = await createOrHydrate({
      order: daimoPayOrder,
      // Use the developer-provided refund address. Default to the sender.
      refundAddress: refundAddress ?? senderAddr,
    });

    log(
      `[PAY TOKEN] hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, paying ${paymentAmount} of token ${required.token.token}`,
    );
    setDaimoPayOrder(hydratedOrder);

    const txHash = await (async () => {
      try {
        if (required.token.token === zeroAddress) {
          return await sendTransactionAsync({
            to: hydratedOrder.intentAddr,
            value: paymentAmount,
          });
        } else {
          return await writeContractAsync({
            abi: erc20Abi,
            address: getAddress(required.token.token),
            functionName: "transfer",
            args: [hydratedOrder.intentAddr, paymentAmount],
          });
        }
      } catch (e) {
        console.error(`[PAY TOKEN] error sending token: ${e}`);
        throw e;
      }
    })();

    if (txHash) {
      await trpc.processSourcePayment.mutate({
        orderId: daimoPayOrder.id.toString(),
        sourceInitiateTxHash: txHash,
        sourceChainId: required.token.chainId,
        sourceFulfillerAddr: assertNotNull(
          senderAddr,
          `[PAY TOKEN] senderAddr cannot be null on order ${daimoPayOrder.id}`,
        ),
        sourceToken: required.token.token,
        sourceAmount: paymentAmount.toString(),
      });
      // TODO: update order immediately, do not wait for polling.
    }
  };

  return { payWithToken };
}
