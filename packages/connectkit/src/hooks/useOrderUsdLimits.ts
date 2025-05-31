import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

export function useOrderUsdLimits({ trpc }: { trpc: TrpcClient }) {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshOrderUsdLimits = async () => {
      setLoading(true);
      try {
        const { limits: newLimits } = await trpc.getOrderUsdLimits.query();
        setLimits(newLimits);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    refreshOrderUsdLimits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { limits, loading };
}
