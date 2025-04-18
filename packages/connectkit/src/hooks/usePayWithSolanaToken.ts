import {
  assert,
  assertNotNull,
  DaimoPayOrder,
  SolanaPublicKey,
} from "@daimo/pay-common";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { Address, hexToBytes } from "viem";
import { TrpcClient } from "../utils/trpc";
import { CreateOrHydrateFn } from "./hookTypes";

export function usePayWithSolanaToken({
  trpc,
  refundAddress,
  daimoPayOrder,
  setDaimoPayOrder,
  createOrHydrate,
  log,
}: {
  trpc: TrpcClient;
  refundAddress: Address | undefined;
  daimoPayOrder: DaimoPayOrder | undefined;
  setDaimoPayOrder: (order: DaimoPayOrder) => void;
  createOrHydrate: CreateOrHydrateFn;
  log: (message: string) => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const payWithSolanaToken = async (inputToken: SolanaPublicKey) => {
    assert(!!wallet.publicKey, "[PAY SOLANA] No wallet connected");
    assert(!!daimoPayOrder, "[PAY SOLANA] daimoPayOrder cannot be null");

    const orderId = daimoPayOrder.id;
    const { hydratedOrder } = await createOrHydrate({
      order: daimoPayOrder,
      refundAddress,
    });

    log(
      `[CHECKOUT] Hydrated order: ${JSON.stringify(
        hydratedOrder,
      )}, checking out with Solana ${inputToken}`,
    );

    const txHash = await (async () => {
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
        setDaimoPayOrder(hydratedOrder);
        throw e;
      } finally {
        setDaimoPayOrder(hydratedOrder);
      }
    })();

    // TOOD: get the actual amount sent from the tx logs.
    // We are currently using a fake amount = 0.
    trpc.processSolanaSourcePayment.mutate({
      orderId: orderId.toString(),
      startIntentTxHash: txHash,
      token: inputToken,
    });

    return txHash;
  };

  return { payWithSolanaToken };
}
