import {
  assert,
  DaimoPayHydratedOrderWithOrg,
  DaimoPayTokenAmount,
  worldchainUSDC,
  worldchainWLD,
} from "@daimo/pay-common";
import { getAddress } from "viem";

import {
  MiniAppPaymentPayload,
  MiniKit,
  PayCommandInput,
  Tokens,
} from "@worldcoin/minikit-js";

/**
 * Open Worldcoin's payment drawer and prompt the user to pay a Daimo Pay order.
 */
export async function promptWorldcoinPayment(
  order: DaimoPayHydratedOrderWithOrg,
  trpc: any,
): Promise<{ paymentId: string; finalPayload: MiniAppPaymentPayload } | null> {
  try {
    if (!MiniKit.isInstalled()) {
      console.error(
        "[WORLD] MiniKit is not installed. Please install @worldcoin/minikit-js to use this feature.",
      );
      return null;
    }

    const paymentOptions = (await trpc.getTokenPaymentOptions.query({
      orderId: order.id,
      tokens: [
        {
          chainId: worldchainWLD.chainId,
          token: worldchainWLD.token,
        },
        {
          chainId: worldchainUSDC.chainId,
          token: worldchainUSDC.token,
        },
      ],
    })) as DaimoPayTokenAmount[];

    const wld = paymentOptions.find(
      (opt) => getAddress(opt.token.token) === getAddress(worldchainWLD.token),
    );
    const usdc = paymentOptions.find(
      (opt) => getAddress(opt.token.token) === getAddress(worldchainUSDC.token),
    );

    assert(wld != null, "WLD DP token not found");
    assert(usdc != null, "USDC DP token not found");

    const paymentId = crypto.randomUUID().replace(/-/g, "");
    const payload: PayCommandInput = {
      reference: paymentId,
      to: order.intentAddr,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: wld.amount,
        },
        {
          symbol: Tokens.USDC,
          token_amount: usdc.amount,
        },
      ],
      description: order.metadata.intent,
    };
    const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
    return { paymentId, finalPayload };
  } catch (error: unknown) {
    console.error("[WORLD] Error sending payment", error);
    return null;
  }
}
