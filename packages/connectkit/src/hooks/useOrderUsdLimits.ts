import { useEffect, useState } from "react";
import { TrpcClient } from "../utils/trpc";

export function useOrderUsdLimits({ trpc }: { trpc: TrpcClient }) {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshOrderUsdLimits = async () => {
      setLoading(true);
      try {
        // const { limits: newLimits } = await trpc.getOrderUsdLimits.query();
        const newLimits = {
          "1": 30000,
          "10": 30000,
          "56": 500,
          "137": 30000,
          "480": 3000,
          "8453": 30000,
          "42161": 30000,
          "42220": 500,
          "59144": 3000,
          "534352": 10000,
        };
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
