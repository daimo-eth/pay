import { assert, assertNotNull, SolanaPublicKey } from "@daimo/pay-common";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Address, hexToBytes } from "viem";
import { PaymentState, PaymentStateType } from "../payment/paymentFsm";
import { TrpcClient } from "../utils/trpc";

export function usePayWithSolanaToken({
  payerPublicKey,
  paymentState,
  orderId,
  hydrateOrder,
  paySolanaSource,
  trpc,
  log,
}: {
  payerPublicKey: PublicKey | null;
  paymentState: PaymentStateType;
  orderId: bigint | undefined;
  hydrateOrder: (
    refundAddress?: Address,
  ) => Promise<Extract<PaymentState, { type: "payment_unpaid" }>>;
  paySolanaSource: (args: {
    paymentTxHash: string;
    sourceToken: SolanaPublicKey;
  }) => void;
  trpc: TrpcClient;
  log: (message: string) => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const payWithSolanaToken = async (inputToken: SolanaPublicKey) => {
    assert(
      payerPublicKey != null,
      "[PAY SOLANA] null payerPublicKey when paying on solana",
    );
    assert(orderId != null, "[PAY SOLANA] null orderId when paying on solana");
    assert(
      paymentState === "preview" || paymentState === "unhydrated",
      `[PAY SOLANA] paymentState is ${paymentState}, must be preview or unhydrated`,
    );

    const { order: hydratedOrder } = await hydrateOrder();

    log(
      `[PAY SOLANA] Hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, checking out with Solana ${inputToken}`,
    );

    const paymentTxHash = await (async () => {
      try {
        const serializedTx = await trpc.getSolanaSwapAndBurnTx.query({
          orderId: orderId.toString(),
          userPublicKey: assertNotNull(
            wallet.publicKey,
            "[PAY SOLANA] wallet.publicKey cannot be null",
          ).toString(),
          inputTokenMint: inputToken,
        });
        const tx = VersionedTransaction.deserialize(hexToBytes(serializedTx));
        const txHash = await wallet.sendTransaction(tx, connection);
        return txHash;
      } catch (e) {
        console.error(e);
        throw e;
      }
    })();

    paySolanaSource({
      paymentTxHash: paymentTxHash,
      sourceToken: inputToken,
    });

    return paymentTxHash;
  };

  return { payWithSolanaToken };
}
