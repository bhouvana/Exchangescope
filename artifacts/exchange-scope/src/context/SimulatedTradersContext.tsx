import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useListTraders, useListStocks } from "@workspace/api-client-react";
import { useRegion, type Region } from "@/context/RegionContext";

const NASDAQ_SYMBOLS = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AVGO","ORCL","CRM","AMD","INTC","QCOM","TXN","ADBE","NOW","PANW","CRWD","SNOW","NET","PLTR","SMCI","ARM","COIN","MSTR","JPM","GS","MS","BAC","V","MA","AXP","PYPL","BLK","SCHW","UNH","LLY","JNJ","MRK","ABBV","PFE","TMO","ABT","AMGN","GILD","VRTX","ISRG","BSX","MDT","XOM","CVX","COP","EOG","SLB","OXY","MPC","VLO","PSX","HAL","CAT","DE","UPS","FDX","GE","HON","LMT","BA","NOC","HD","MCD","NKE","SBUX","LOW","TGT","BKNG","CMG","TJX","ROST","WMT","COST","PG","KO","PEP","LIN","SHW","NEE","SO","DUK","T","VZ","CMCSA","DIS","NFLX","UBER","ABNB","LYFT","SNAP","PINS","RBLX","DASH","WDAY","TEAM","ZM","DOCU","OKTA","DDOG","MDB","ESTC"];

const BSE_SYMBOLS = ["RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","HINDUNILVR","ITC","SBIN","BHARTIARTL","KOTAKBANK","BAJFINANCE","LT","WIPRO","AXISBANK","TITAN","ASIANPAINT","MARUTI","SUNPHARMA","NTPC","ONGC","M&M","POWERGRID","ULTRACEMCO","TATASTEEL","JSWSTEEL","TATA MOTORS","HCLTECH","TECHM","GRASIM","ADANIPORTS","BAJAJFINSV","NESTLEIND","HDFCPM","INDUSINDBK","DRREDDY","CIPLA","BRITANNIA","DABUR","HEROMOTOCO","EICHERMOT","HAVELLS","GODREJCP","TORNTPHARM","LTIM","MPHASIS","DIVISLAB","TCS","PIDILITIND","COALINDIA","IOC","BPCL","GAIL","HINDALCO","VEDL","SAIL","JSWSTEEL","TATACONSUM","TRENT","ZOMATO","PAYTM","POLICYBZ","NYKAA","INFOEDGE","PERSISTENT","CYIENT","LTTS","CGPOWER","ADANIGREEN","ADANITRANS","ADANIPOWER","TATAPOWER","SIEMENS","ABB","BHEL","BEL","HAL","IRCTC","RVNL","RAILTEL","CONCOR","NHPC","JYOTHYLAB","KTKBANK","FEDERALBNK","YESBANK","IDFCFIRSTB","BANDHANBNK","PNB","CANBK","UNIONBANK","INDIANB","AUBANK","MUTHOOTFIN","HINDZINC","HINDCOPPER","NATIONALUM","NMDC","MOIL"];

const NASDAQ_NAMES = [
  "AlphaQuant", "BetaTrader", "GammaCap", "DeltaFund", "EpsilonCap", "ZetaPrime", "EtaTrade", "ThetaCap",
  "IotaVentures", "KappaAlpha", "LambdaTrade", "MuCapital", "NuAdvisors", "XiFund", "OmicronTrade", "PiCap",
  "RhoAlpha", "SigmaPrime", "TauTrade", "UpsilonCap", "PhiVentures", "ChiAlpha", "PsiTrade", "OmegaCap",
  "ApexTrade", "BridgeCap", "CrestFund", "DeltaPrime", "EdgeTrade", "FalconCap", "GlacierTrade", "HorizonAlpha",
  "InfinityCap", "JadeTrade", "KestrelCap", "LegacyFund", "MatrixTrade", "NexusCap", "OnyxTrade", "PrimeCap",
  "QuantumTrade", "RavenCap", "SageFund", "TitanTrade", "UnityCap", "VertexTrade", "WaveCap", "XenoTrade",
  "YieldCap", "ZenithTrade", "ArrowCap", "BladeTrade", "CipherCap", "DriftTrade", "EchoCap", "FluxTrade",
  "GravityCap", "HelixTrade", "IonCap", "JouleTrade", "KineticCap", "LaserTrade", "MomentumCap", "NeonTrade",
  "OrbitCap", "PhotonTrade", "QuasarCap", "RadianTrade", "SolarCap", "TerraTrade", "UltraCap", "VortexTrade",
  "WarpCap", "XenonTrade", "ZeroCap", "ApolloAlpha", "BorealisCap", "CosmosTrade", "DracoCap", "EquinoxFund",
  "FusionTrade", "GalaxyCap", "HydraTrade", "IrisFund", "JupiterCap", "KeplerTrade", "LyraCap", "MeridianTrade",
  "NebulaCap", "OrionTrade", "PulsarCap", "QuillTrade", "RigelCap", "SiriusTrade", "TalonCap", "UrsaTrade",
  "VegaCap", "WolfTrade", "XerxesCap", "YetiTrade", "ZephyrCap",
];

const BSE_NAMES = [
  "AgarwalCap", "BajajTrade", "ChopraFund", "DesaiAlpha", "DoshiVentures", "GandhiTrade", "GuptaCap", "HegdeTrade",
  "JainCapital", "JoshiAlpha", "KothariTrade", "LalFund", "MalhotraCap", "MehtaTrade", "MishraVentures", "ModyCap",
  "MukherjeeTrade", "NairCapital", "OberoiAlpha", "PadgaonkarTrade", "ParikhFund", "PatelTrade", "PillaiCap", "RajanTrade",
  "ReddyCapital", "RoyAlpha", "SachdevTrade", "SahniFund", "SaxenaCap", "ShahTrade", "SharmaVentures", "ShenoyCap",
  "ShuklaTrade", "SinghCapital", "SinhaAlpha", "SomaniTrade", "SoniFund", "SubramanianCap", "TalatiTrade", "ThakkarCap",
  "ThakurTrade", "TrivediAlpha", "VarmaCapital", "VoraTrade", "WaghFund", "YadavCap", "AdvaniTrade", "AnandAlpha",
  "ApteCapital", "AroraTrade", "AyyarFund", "BadamiCap", "BakshiTrade", "BalsaraAlpha", "BatraVentures", "BhandariCap",
  "BhatCapital", "BhatiaTrade", "BhaveFund", "BoseAlpha", "ChakrabortyTrade", "ChandrasekharCap", "ChatterjeeTrade",
  "ChauhanFund", "ChoudhuryAlpha", "DalalCap", "DasTrade", "DaveCapital", "DeolTrade", "DeshmukhFund", "DhawanCap",
  "DixitTrade", "DubeyAlpha", "DuttaCapital", "FernandesTrade", "GaikwadFund", "GeorgeCap", "GhoshTrade", "GillAlpha",
  "GokhaleCap", "GoswamiTrade", "GrewalFund", "HandaCap", "HoraTrade", "IssacAlpha", "IyerCapital", "JhaveriTrade",
  "JohalFund", "JunejaCap", "KadamTrade", "KakkarAlpha", "KamatCapital", "KanadeTrade", "KapadiaFund", "KapoorCap",
  "KarpeTrade", "KashyapAlpha", "KaulCapital", "KhandelwalTrade", "KhannaFund", "KohliCap", "KrishnanTrade", "KulkarniAlpha",
  "KumarCapital", "KurianTrade",
];

interface SimTrader {
  id: string;
  type: string;
  symbol: string;
  ordersPlaced: number;
  fills: number;
  pnl: number;
  position: number;
  isActive: boolean;
  lastAction: string | null;
  avgEntryPrice: number;
  winRate: number;
  avgTradeSize: number;
  totalValue: number;
  history: { time: string; action: string; symbol: string; qty: number; price: number }[];
}

interface SimulatedTradersContextValue {
  allTraders: SimTrader[];
}

const SimulatedTradersContext = createContext<SimulatedTradersContextValue>({ allTraders: [] });

let uid = 0;
function genId() { return ++uid; }

function getSymbolsForRegion(region: Region): string[] {
  return region === "nasdaq" ? NASDAQ_SYMBOLS : BSE_SYMBOLS;
}

function getNamesForRegion(region: Region): string[] {
  return region === "nasdaq" ? NASDAQ_NAMES : BSE_NAMES;
}

function createTrader(index: number, region: Region): SimTrader {
  const types = ["retail", "market_maker", "momentum", "panic"] as const;
  const names = getNamesForRegion(region);
  const symbols = getSymbolsForRegion(region);
  return {
    id: `${names[index % names.length]}-${genId()}`,
    type: types[index % 4],
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    ordersPlaced: Math.floor(Math.random() * 85) + 5,
    fills: Math.floor(Math.random() * 40),
    pnl: (Math.random() - 0.45) * 25000,
    position: Math.floor((Math.random() - 0.4) * 500),
    isActive: Math.random() > 0.15,
    lastAction: "",
    avgEntryPrice: 100 + Math.random() * 400,
    winRate: 0.3 + Math.random() * 0.5,
    avgTradeSize: Math.floor(Math.random() * 300) + 20,
    totalValue: 50000 + Math.random() * 500000,
    history: Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (19 - i) * 2500).toLocaleTimeString(),
      action: ["BOUGHT", "SOLD", "ADDED", "REDUCED"][Math.floor(Math.random() * 4)],
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      qty: Math.floor(Math.random() * 200) + 10,
      price: 50 + Math.random() * 400,
    })),
  };
}

const TARGET = 100;

export function SimulatedTradersProvider({ children }: { children: ReactNode }) {
  const { region } = useRegion();
  const { data: apiTraders } = useListTraders({ query: { refetchInterval: 3000 } } as any);
  const { data: allStockQuotes } = useListStocks({ query: { refetchInterval: 30000 } } as any) as any;
  const regionRef = useRef(region);

  const liveSymbols = useMemo(() => {
    if (allStockQuotes?.length) return allStockQuotes.map((s: any) => s.symbol);
    return getSymbolsForRegion(region);
  }, [allStockQuotes, region]);

  const [simTraders, setSimTraders] = useState<SimTrader[]>(() =>
    Array.from({ length: TARGET }, (_, i) => createTrader(i, region))
  );

  // Regenerate traders when region changes
  useEffect(() => {
    if (region !== regionRef.current) {
      regionRef.current = region;
      setSimTraders(Array.from({ length: TARGET }, (_, i) => createTrader(i, region)));
    }
  }, [region]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSimTraders(prev => prev.map(t => {
        if (Math.random() > 0.3) return t;
        const actions = ["BOUGHT", "SOLD", "ADDED", "REDUCED"] as const;
        const action = actions[Math.floor(Math.random() * 4)];
        const isBuy = action === "BOUGHT" || action === "ADDED";
        const qty = Math.floor(Math.random() * 150) + 5;
        const price = 50 + Math.random() * 400;
        const newPnl = t.pnl + (isBuy ? -1 : 1) * qty * price * (Math.random() * 0.02);
        const newPos = t.position + (isBuy ? qty : -qty);
        const symbols = liveSymbols.length ? liveSymbols : getSymbolsForRegion(regionRef.current);
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        return {
          ...t,
          pnl: Math.round(newPnl * 100) / 100,
          position: Math.max(-1000, Math.min(1000, newPos)),
          ordersPlaced: t.ordersPlaced + (Math.random() > 0.6 ? 1 : 0),
          fills: t.fills + (Math.random() > 0.65 ? 1 : 0),
          symbol: Math.random() > 0.85 ? randomSymbol : t.symbol,
          isActive: Math.random() > 0.03 ? t.isActive : !t.isActive,
          winRate: Math.max(0.1, Math.min(0.95, t.winRate + (Math.random() - 0.5) * 0.04)),
          avgTradeSize: Math.max(5, t.avgTradeSize + Math.floor((Math.random() - 0.5) * 20)),
          totalValue: Math.max(1000, t.totalValue + (Math.random() - 0.5) * 20000),
          avgEntryPrice: Math.random() > 0.85 ? 100 + Math.random() * 400 : t.avgEntryPrice,
          lastAction: `${action} ${qty} ${t.symbol} @ $${price.toFixed(2)}`,
          history: [...t.history.slice(-19), {
            time: new Date().toLocaleTimeString(),
            action,
            symbol: t.symbol,
            qty,
            price: Math.round(price * 100) / 100,
          }],
        };
      }));
    }, 2000);
    return () => clearInterval(tick);
  }, [liveSymbols]);

  const allTraders = useMemo(() => {
    const merged = [...simTraders];
    if (apiTraders?.length) {
      for (const apiT of apiTraders) {
        const idx = merged.findIndex(m => m.id === apiT.id);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...apiT };
      }
    }
    return merged;
  }, [simTraders, apiTraders]);

  return (
    <SimulatedTradersContext.Provider value={{ allTraders }}>
      {children}
    </SimulatedTradersContext.Provider>
  );
}

export function useSimulatedTraders() {
  return useContext(SimulatedTradersContext);
}

export { getSymbolsForRegion, getNamesForRegion };
