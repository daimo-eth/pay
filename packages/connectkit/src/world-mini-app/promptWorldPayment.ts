import {
  assert,
  DaimoPayHydratedOrderWithOrg,
  DaimoPayTokenAmount,
  worldchainUSDCe,
  worldchainWLD,
} from "@daimo/pay-common";
import {
  MiniAppPaymentPayload,
  MiniKit,
  PayCommandInput,
  Tokens,
} from "@worldcoin/minikit-js";
import { getAddress } from "viem";

/**
 * Open Worldcoin's payment drawer and prompt the user to pay a Daimo Pay order.
 */
export async function promptWorldcoinPayment(
  order: DaimoPayHydratedOrderWithOrg,
  trpc: any,
): Promise<{ paymentId: string; finalPayload: MiniAppPaymentPayload } | null> {
  if (!MiniKit.isInstalled()) {
    return null;
  }

  try {
    const paymentOptions = (await trpc.getTokenPaymentOptions.query({
      orderId: order.id,
      tokens: [
        {
          chainId: worldchainWLD.chainId,
          token: worldchainWLD.token,
        },
        {
          chainId: worldchainUSDCe.chainId,
          token: worldchainUSDCe.token,
        },
      ],
    })) as DaimoPayTokenAmount[];

    const wld = paymentOptions.find(
      (opt) => getAddress(opt.token.token) === getAddress(worldchainWLD.token),
    );
    const usdc = paymentOptions.find(
      (opt) =>
        getAddress(opt.token.token) === getAddress(worldchainUSDCe.token),
    );

    assert(wld != null, "WLD DP token not found");
    assert(usdc != null, "USDCe DP token not found");

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
          symbol: Tokens.USDCE,
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
