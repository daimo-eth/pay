import {
  base,
  bsc,
  DepositAddressPaymentOptions,
  polygon,
  RozoPayOrderMode,
} from "@rozoai/intent-common";
import { useEffect, useState } from "react";
import { chainToLogo } from "../assets/chains";
import { TrpcClient } from "../utils/trpc";

export function useDepositAddressOptions({
  trpc,
  usdRequired,
  mode,
}: {
  trpc: TrpcClient;
  usdRequired: number | undefined;
  mode: RozoPayOrderMode | undefined;
}) {
  const [options, setOptions] = useState<
    {
      id: DepositAddressPaymentOptions;
      logoURI: string | React.ReactNode;
      minimumUsd: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshDepositAddressOptions = async (
      usd: number,
      mode: RozoPayOrderMode
    ) => {
      setLoading(true);
      try {
        // const options = await trpc.getDepositAddressOptions.query({
        //   usdRequired: usd,
        //   mode,
        // });
        const options: {
          id: DepositAddressPaymentOptions;
          logoURI: string | React.ReactNode;
          minimumUsd: number;
        }[] = [
          // {
          //   id: "USDT on Tron",
          //   logoURI: "https://pay.daimo.com/chain-logos/tronusdt.svg",
          //   minimumUsd: 1,
          // },
          // {
          //   id: "Arbitrum",
          //   logoURI: "https://pay.daimo.com/chain-logos/arbitrum.svg",
          //   minimumUsd: 0,
          // },
          {
            id: DepositAddressPaymentOptions.BSC,
            logoURI: chainToLogo[bsc.chainId],
            minimumUsd: 0.1,
          },
          {
            id: DepositAddressPaymentOptions.BASE,
            logoURI: chainToLogo[base.chainId],
            minimumUsd: 0.1,
          },
          // {
          //   id: DepositAddressPaymentOptions.SOLANA,
          //   logoURI: chainToLogo[solana.chainId],
          //   minimumUsd: 0,
          // },
          // {
          //   id: "Optimism",
          //   logoURI: "https://pay.daimo.com/chain-logos/optimism.svg",
          //   minimumUsd: 0,
          // },
          {
            id: DepositAddressPaymentOptions.POLYGON,
            logoURI: chainToLogo[polygon.chainId],
            minimumUsd: 0.1,
          },
          // {
          //   id: DepositAddressPaymentOptions.STELLAR,
          //   logoURI: chainToLogo[stellar.chainId],
          //   minimumUsd: 0,
          // },
          // {
          //   id: "Ethereum",
          //   logoURI: "https://pay.daimo.com/chain-logos/ethereum.svg",
          //   minimumUsd: 10,
          // },
        ];
        setOptions(options);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (usdRequired != null && mode != null) {
      refreshDepositAddressOptions(usdRequired, mode);
    }
  }, [usdRequired, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return { options, loading };
}
