export type PipelineLayer = "CLIENT" | "INGRESS" | "CONTROLS" | "QUEUE" | "CORE" | "POST-TRADE" | "FEED" | "UI";

export interface StageMeta {
  abbr: string;
  name: string;
  layer: PipelineLayer;
  color: string;
  subsystem: string;
  protocol: string;
  algorithm: string;
  dataStructure: string;
  explain: string;
  deepDive: string[];
  checks?: string[];
}

export const PIPELINE_LAYERS: { id: PipelineLayer; label: string; color: string }[] = [
  { id: "CLIENT", label: "Client", color: "#6B7280" },
  { id: "INGRESS", label: "Ingress", color: "#00FF88" },
  { id: "CONTROLS", label: "Controls", color: "#00BFFF" },
  { id: "QUEUE", label: "Queue", color: "#A855F7" },
  { id: "CORE", label: "Core", color: "#00FF88" },
  { id: "POST-TRADE", label: "Post-Trade", color: "#FFB800" },
  { id: "FEED", label: "Feed", color: "#FF6B6B" },
  { id: "UI", label: "UI", color: "#888" },
];

export const STAGE_META: StageMeta[] = [
  {
    abbr: "YOU",
    name: "Trader",
    layer: "CLIENT",
    color: "#6B7280",
    subsystem: "Order Entry UI",
    protocol: "HTTPS / JSON",
    algorithm: "Client-side validation",
    dataStructure: "OrderIntent { symbol, side, type, qty, price }",
    explain: "You — the person submitting the order. Your request is serialized into JSON and sent over HTTPS to the exchange API gateway.",
    deepDive: [
      "The browser packages your intent into a REST payload — not a FIX message yet. Real brokers convert this to FIX 4.2/4.4 before hitting the exchange.",
      "Client-side checks: positive quantity, valid symbol format, limit price precision (tick size). Server-side validation is authoritative.",
      "Timestamp T₀ is recorded when the HTTP request leaves your machine — this is NOT the exchange timestamp. Network RTT is excluded from matching latency.",
    ],
  },
  {
    abbr: "GW",
    name: "Gateway",
    layer: "INGRESS",
    color: "#00FF88",
    subsystem: "Session Gateway",
    protocol: "FIX 4.2 / OUCH",
    algorithm: "Session auth + sequence assignment",
    dataStructure: "GatewaySession { sessionId, seqNum, credentials }",
    explain: "The exchange front door. Authenticates your session, assigns a sequence number, and timestamps arrival to the microsecond.",
    deepDive: [
      "Gateway performs TLS termination, session token validation, and rate limiting (messages per second per session).",
      "Exchange timestamp T₁ assigned here — this is the official 'order received' time for regulatory audit (CAT reporting).",
      "In production: colocated clients achieve ~5–15µs wire-to-gateway; remote retail brokers add 1–50ms of network transit.",
      "Rejected here: invalid session, expired credentials, rate limit exceeded, malformed message envelope.",
    ],
    checks: ["TLS handshake", "Session token", "Rate limit", "Msg envelope"],
  },
  {
    abbr: "RISK",
    name: "Risk Check",
    layer: "CONTROLS",
    color: "#FFB800",
    subsystem: "Pre-Trade Risk",
    protocol: "Internal RPC",
    algorithm: "Buying power + position limits",
    dataStructure: "RiskState { cash, positions, limits, exposure }",
    explain: "Pre-trade risk controls verify buying power, position limits, and concentration rules before the order touches the book.",
    deepDive: [
      "Buying power check: required = qty × price × margin_rate. Fails if insufficient funds — order rejected with code 201 (insufficient buying power).",
      "Position limits: max shares per symbol, max notional exposure, sector concentration caps for institutional accounts.",
      "Fat-finger protection: reject orders > N% away from NBBO (e.g., buy at $500 when stock trades at $210).",
      "This stage is synchronous and blocking — the order cannot proceed until risk clears. Typical latency: 20–40µs on optimized systems.",
    ],
    checks: ["Buying power", "Position limit", "Fat-finger", "Concentration"],
  },
  {
    abbr: "VAL",
    name: "Validation",
    layer: "CONTROLS",
    color: "#00BFFF",
    subsystem: "Order Validator",
    protocol: "Internal schema",
    algorithm: "Constraint satisfaction",
    dataStructure: "ValidatedOrder { sym, qty, price, type, constraints[] }",
    explain: "Validates symbol existence, quantity granularity, price tick size, and circuit breaker (LULD) bands.",
    deepDive: [
      "Symbol lookup against instrument master — rejects unknown tickers immediately.",
      "Quantity must be positive integer; some venues support odd-lot but most require round lots (100 shares).",
      "Price must align to tick size ($0.01 for stocks > $1.00). Limit price must fall within LULD bands.",
      "Order type validation: market orders cannot have a limit price; stop orders require trigger price.",
    ],
    checks: ["Symbol exists", "Qty > 0", "Tick size", "LULD band"],
  },
  {
    abbr: "QUE",
    name: "Order Queue",
    layer: "QUEUE",
    color: "#A855F7",
    subsystem: "Ingress Queue",
    protocol: "Lock-free MPSC",
    algorithm: "FIFO enqueue + seq assignment",
    dataStructure: "MpscQueue<Order> + atomic<uint64_t> seqNum",
    explain: "Order joins a lock-free multi-producer single-consumer queue. Sequence number establishes time priority within price level.",
    deepDive: [
      "MPSC queue: multiple gateway threads enqueue; single matching thread dequeues. No mutex — uses atomic compare-and-swap.",
      "Sequence number is monotonically increasing per symbol — this IS the 'time' in price-time priority.",
      "Queue depth is a key health metric. Sustained depth > 1000 indicates matching engine is falling behind ingress rate.",
      "Back-pressure: if queue exceeds threshold, gateway may reject new orders (exchange 'slow' condition).",
    ],
  },
  {
    abbr: "ENG",
    name: "Matching Engine",
    layer: "CORE",
    color: "#00FF88",
    subsystem: "C++ Matching Engine",
    protocol: "In-process IPC (stdin/stdout JSON)",
    algorithm: "Price-time priority",
    dataStructure: "OrderBook { bids: Map<Price, Level>, asks: Map<Price, Level> }",
    explain: "The C++ engine scans resting orders at the best price. If your buy ≥ best ask (or sell ≤ best bid), an immediate match occurs.",
    deepDive: [
      "Price-time priority: best price wins; within same price, earliest sequence number wins (FIFO).",
      "For a buy limit at $210 with best ask at $209.50: immediate match at $209.50 (price improvement — you pay less than your limit).",
      "For a buy limit at $208 with best ask at $209.50: no match — order rests in the book as a new bid level.",
      "Matching is atomic per symbol — no interleaving of matches during a single engine tick. Implemented as a single-threaded event loop per symbol partition.",
      "This simulator uses a real compiled C++ engine communicating via JSON over stdin/stdout — not a mock.",
    ],
  },
  {
    abbr: "EXE",
    name: "Trade Execution",
    layer: "POST-TRADE",
    color: "#FFB800",
    subsystem: "Execution Handler",
    protocol: "FIX Execution Report (35=8)",
    algorithm: "Atomic book update + fill generation",
    dataStructure: "Trade { id, price, qty, buyOrderId, sellOrderId, ts }",
    explain: "Trade records generated, order book updated atomically, both counterparties receive execution reports.",
    deepDive: [
      "Execution report (FIX tag 35=8) sent to both buyer and seller with fill price (tag 31), fill qty (tag 32), and status (tag 150).",
      "Partial fills: if only part of the order matches, remaining quantity stays in the book with reduced qty.",
      "Book update is atomic — bid/ask levels adjusted, quantities decremented, empty levels removed.",
      "Trade bust/correction is extremely rare but supported via bust messages — requires exchange operator intervention.",
    ],
  },
  {
    abbr: "MD",
    name: "Market Data Broadcast",
    layer: "FEED",
    color: "#FF6B6B",
    subsystem: "ITCH 5.0 Publisher",
    protocol: "ITCH 5.0 binary",
    algorithm: "Fan-out to all subscribers",
    dataStructure: "ItchMsg { type, symbol, price, qty, ref }",
    explain: "New trade and book changes published to all market data subscribers via ITCH 5.0 binary protocol.",
    deepDive: [
      "ITCH message types: 'A' add order, 'E' execute, 'D' delete, 'U' replace, 'P' trade (non-displayable).",
      "Multicast UDP to thousands of subscribers simultaneously — retail SIP feed is a slower consolidated version.",
      "SIP (Securities Information Processor) aggregates NBBO across all exchanges with ~1–5ms delay vs direct feed.",
      "Market data is the exchange's primary revenue stream — feed fees range from $1K/month (retail) to $500K+/year (HFT direct).",
    ],
  },
  {
    abbr: "UI",
    name: "Dashboard Update",
    layer: "UI",
    color: "#888888",
    subsystem: "WebSocket Fanout",
    protocol: "WS JSON events",
    algorithm: "React state reconciliation",
    dataStructure: "WsEvent { type, payload, ts }",
    explain: "WebSocket pushes order update, trade, and book delta to your browser. React reconciles state and re-renders.",
    deepDive: [
      "Three parallel WS channels: order_update (your fill status), trade (public tape), book_delta (L2 changes).",
      "This stage is excluded from exchange-reported latency — it's client-side rendering time.",
      "Typical WS delivery: 1–5ms from server to browser. React reconciliation adds 1–16ms depending on component tree.",
    ],
  },
];

export interface OrderContext {
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  quantity: number;
  price?: number;
  orderId?: string;
}

export function generateTraceMessage(stageIndex: number, ctx: OrderContext, seqNum?: number): string {
  const id = ctx.orderId ?? `ORD-${Date.now().toString(36).toUpperCase()}`;
  const side = ctx.side === "buy" ? "1" : "2";
  const sideLabel = ctx.side.toUpperCase();
  const ordType = ctx.type === "limit" ? "2" : "1";
  const px = ctx.price?.toFixed(2) ?? "MKT";
  const seq = seqNum ?? Date.now();

  const messages: string[] = [
    `→ POST /api/orders  { symbol:"${ctx.symbol}", side:"${sideLabel}", type:"${ctx.type.toUpperCase()}", qty:${ctx.quantity}${ctx.price ? `, price:${px}` : ""} }`,
    `FIX 4.2 │ 35=D │ 11=${id} │ 55=${ctx.symbol} │ 54=${side} │ 38=${ctx.quantity} │ 40=${ordType}${ctx.price ? ` │ 44=${px}` : ""} │ 60=${new Date().toISOString()}`,
    `RISK │ buying_power=PASS │ position_limit=PASS │ fat_finger=PASS │ concentration=PASS │ latency_budget=35µs`,
    `VALIDATE │ sym=${ctx.symbol} ✓ │ qty=${ctx.quantity} ✓ │ tick_size=0.01 ✓ │ luld_band=PASS │ order_type=${ctx.type.toUpperCase()} ✓`,
    `ENQUEUE │ seq=${seq} │ queue=mpsc_lockfree │ partition=${ctx.symbol} │ priority=FIFO │ depth=+1`,
    `MATCH │ algo=price_time │ scan=${ctx.side === "buy" ? "asks" : "bids"}[0..n] │ cross=${ctx.type === "market" ? "FORCED" : "EVAL"} │ engine=cpp_native`,
    `EXEC │ 35=8 │ 11=${id} │ 150=2(FILLED) │ 32=${ctx.quantity} │ 31=${px} │ 14=${ctx.quantity} │ counterparty=matched`,
    `ITCH │ type=E │ symbol=${ctx.symbol} │ price=${ctx.price ? Math.round(ctx.price * 100) : "MKT"} │ qty=${ctx.quantity} │ ref=${id.slice(-8)}`,
    `WS → { type:"order_update", orderId:"${id}", status:"filled" } │ book_delta │ trade_tape`,
  ];

  return messages[stageIndex] ?? messages[messages.length - 1];
}

export function getLayerForStage(index: number): PipelineLayer {
  return STAGE_META[index]?.layer ?? "CLIENT";
}
