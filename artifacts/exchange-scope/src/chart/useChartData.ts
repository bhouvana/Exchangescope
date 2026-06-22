import { useMemo } from "react";
import { useGetStockHistory } from "@workspace/api-client-react";
import type { OHLCBar, EnrichedBar, TimeframeId } from "./types";
import { enrichBars } from "./utils";

export function useChartData(symbol: string, range: TimeframeId) {
  const { data: raw, isLoading } = useGetStockHistory(symbol, range as any, {
    query: { staleTime: range === "1d" ? 5000 : 60000, refetchInterval: range === "1d" ? 10000 : undefined },
  } as any);

  const bars: OHLCBar[] = useMemo(() => {
    if (!raw?.length) return [];
    const result: OHLCBar[] = raw.map((b: any) => ({
      timestamp: b.timestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      isUp: b.close >= b.open,
    }));
    return result;
  }, [raw]);

  const enriched: EnrichedBar[] = useMemo(() => enrichBars(bars), [bars]);

  return { bars, enriched, isLoading };
}

export function useEnrichedBars(bars: OHLCBar[]): EnrichedBar[] {
  return useMemo(() => enrichBars(bars), [bars]);
}
