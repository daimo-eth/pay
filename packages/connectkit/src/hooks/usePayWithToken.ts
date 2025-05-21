import { assert, debugJson, WalletPaymentOption } from "@daimo/pay-common";
import { Address, erc20Abi, getAddress, Hex, zeroAddress } from "viem";
import { useSendTransaction, useWriteContract } from "wagmi";
import { PaymentState, PaymentStateType } from "../payment/paymentFsm";

export function usePayWithToken({
  payerAddress,
  paymentState,
  hydrateOrder,
  payEthSource,
  log,
}: {
  payerAddress: Address | undefined;
  paymentState: PaymentStateType;
  hydrateOrder: (
    refundAddress?: Address,
  ) => Promise<Extract<PaymentState, { type: "payment_unpaid" }>>;
  payEthSource: (args: {
    paymentTxHash: Hex;
    sourceChainId: number;
    payerAddress: Address;
    sourceToken: Address;
    sourceAmount: bigint;
  }) => void;
  log: (message: string) => void;
}) {
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  /** Commit to a token + amount = initiate payment. */
  const payWithToken = async (walletOption: WalletPaymentOption) => {
    assert(
      payerAddress != null,
      `[PAY TOKEN] null payerAddress when paying on ethereum`,
    );
    assert(
      paymentState === "preview" || paymentState === "unhydrated",
      `[PAY TOKEN] paymentState is ${paymentState}, must be preview or unhydrated`,
    );

    const { required, fees } = walletOption;
    assert(
      required.token.token === fees.token.token,
      `[PAY TOKEN] required token ${debugJson(required)} does not match fees token ${debugJson(fees)}`,
    );
    const paymentAmount = BigInt(required.amount) + BigInt(fees.amount);

    // Will use the payerAddress if refundAddress was not set in payParams
    const { order: hydratedOrder } = await hydrateOrder(payerAddress);

    log(
      `[PAY TOKEN] hydrated order: ${debugJson(
        hydratedOrder,
      )}, paying ${paymentAmount} of token ${required.token.token}`,
    );

    const paymentTxHash = await (async () => {
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

    if (paymentTxHash) {
      payEthSource({
        paymentTxHash,
        sourceChainId: required.token.chainId,
        payerAddress,
        sourceToken: getAddress(required.token.token),
        sourceAmount: paymentAmount,
      });
    } else {
      console.error(`[PAY TOKEN] no txHash for payment`);
    }
  };

  return { payWithToken };
}
