import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type Region = "nasdaq" | "nyse" | "nse" | "bse";

export interface RegionMeta {
  exchange: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  timezone: string;
  companyCount?: number;
  isOpen?: boolean;
}

interface RegionContextType {
  region: Region;
  regionMeta: RegionMeta;
  setRegion: (r: Region) => void;
  isSwitching: boolean;
  defaultSymbol: string;
  exchangeList: { id: Region; meta: RegionMeta }[];
}

const REGION_META: Record<Region, RegionMeta> = {
  nasdaq: { exchange: "NASDAQ", currency: "USD", currencySymbol: "$", flag: "\u{1F1FA}\u{1F1F8}", timezone: "America/New_York", companyCount: 3300, isOpen: false },
  nyse:   { exchange: "NYSE",   currency: "USD", currencySymbol: "$", flag: "\u{1F1FA}\u{1F1F8}", timezone: "America/New_York", companyCount: 2300, isOpen: false },
  nse:    { exchange: "NSE",    currency: "INR", currencySymbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}", timezone: "Asia/Kolkata", companyCount: 2700, isOpen: false },
  bse:    { exchange: "BSE",    currency: "INR", currencySymbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}", timezone: "Asia/Kolkata", companyCount: 5500, isOpen: false },
};

const EXCHANGE_LIST = Object.entries(REGION_META).map(([id, meta]) => ({
  id: id as Region,
  meta,
}));

const DEFAULT_SYMBOLS: Record<Region, string> = {
  nasdaq: "AAPL",
  nyse: "JPM",
  nse: "RELIANCE",
  bse: "RELIANCE",
};

const RegionContext = createContext<RegionContextType>({
  region: "nasdaq",
  regionMeta: REGION_META.nasdaq,
  setRegion: () => {},
  isSwitching: false,
  defaultSymbol: "AAPL",
  exchangeList: EXCHANGE_LIST,
});

export const useRegion = () => useContext(RegionContext);

const EXCHANGE_COLORS: Record<Region, string> = {
  nasdaq: "#3B82F6",
  nyse: "#00FF88",
  nse: "#FF9933",
  bse: "#FF9933",
};

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>(() => {
    try { return (localStorage.getItem("region") as Region) || "nasdaq"; } catch { return "nasdaq"; }
  });
  const [regionMeta, setRegionMeta] = useState<RegionMeta>(REGION_META[region]);
  const [isSwitching, setIsSwitching] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/market/region")
      .then(r => r.json())
      .then(data => {
        if (data.region && data.region !== region && ["nasdaq", "nyse", "nse", "bse"].includes(data.region)) {
          const r = data.region as Region;
          setRegionState(r);
          setRegionMeta({ ...REGION_META[r], ...(data.regionMeta || {}) });
          try { localStorage.setItem("region", data.region); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const switchRegion = useCallback(async (newRegion: Region) => {
    if (newRegion === region) return;
    setIsSwitching(true);
    try {
      const res = await fetch("/api/market/region", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region: newRegion }),
      });
      if (res.ok) {
        // Update region state first so query keys change immediately
        setRegionState(newRegion);
        setRegionMeta({ ...REGION_META[newRegion], isOpen: false });
        try { localStorage.setItem("region", newRegion); } catch {}
        // Remove stale cache so previous exchange data never flashes through
        queryClient.removeQueries();
        // Then kick off fresh fetches
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      console.error("Failed to switch region:", err);
    } finally {
      // Small delay lets the new queries start before we lift the switching overlay
      setTimeout(() => setIsSwitching(false), 400);
    }
  }, [region, queryClient]);

  return (
    <RegionContext.Provider value={{
      region,
      regionMeta,
      setRegion: switchRegion,
      isSwitching,
      defaultSymbol: DEFAULT_SYMBOLS[region],
      exchangeList: EXCHANGE_LIST,
    }}>
      {children}
    </RegionContext.Provider>
  );
}
