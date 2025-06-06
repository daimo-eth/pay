import {
  DaimoPayOrderMode,
  DepositAddressPaymentOptionMetadata,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

export function useDepositAddressOptions({
  trpc,
  usdRequired,
  mode,
}: {
  trpc: TrpcClient;
  usdRequired: number | undefined;
  mode: DaimoPayOrderMode | undefined;
}) {
  const [options, setOptions] = useState<DepositAddressPaymentOptionMetadata[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshDepositAddressOptions = async (
      usd: number,
      mode: DaimoPayOrderMode,
    ) => {
      setLoading(true);
      try {
        const options = await trpc.getDepositAddressOptions.query({
          usdRequired: usd,
          mode,
        });
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
