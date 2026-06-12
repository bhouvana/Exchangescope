// Realistic market data simulation — 313 companies, no Python dependency

export interface Quote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  updatedAt: string;
}

export interface OhlcBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// [name, sector, basePrice, marketCapB, pe, w52h, w52l, baseVolM]
type SymbolRow = [string, string, number, number, number, number, number, number];

const SYMBOL_DATA: Record<string, SymbolRow> = {
  // ── Technology (70) ─────────────────────────────────────────────────────────
  AAPL:  ["Apple Inc.",                   "Technology", 212.5, 3250,  33.4, 237.2, 164.1, 62],
  MSFT:  ["Microsoft Corp.",              "Technology", 424.8, 3160,  36.7, 468.4, 344.8, 22],
  NVDA:  ["NVIDIA Corp.",                 "Technology", 138.9, 3410,  52.1, 153.1, 76.2,  280],
  GOOG:  ["Alphabet Inc. (C)",            "Technology", 177.4, 2160,  22.9, 207.1, 140.5, 26],
  GOOGL: ["Alphabet Inc. (A)",            "Technology", 176.8, 2150,  22.7, 206.5, 140.0, 22],
  META:  ["Meta Platforms Inc.",          "Technology", 572.3, 1440,  27.8, 638.4, 414.5, 18],
  AVGO:  ["Broadcom Inc.",                "Technology", 218.0, 1010,  34.2, 251.9, 131.7, 28],
  ORCL:  ["Oracle Corp.",                 "Technology", 185.4,  510,  38.1, 198.3, 122.0, 8],
  CRM:   ["Salesforce Inc.",              "Technology", 298.7,  290,  69.5, 348.9, 212.0, 6],
  ADBE:  ["Adobe Inc.",                   "Technology", 401.2,  176,  42.3, 638.0, 397.6, 4],
  AMD:   ["Advanced Micro Devices",       "Technology", 158.4,  257,  48.1, 187.3, 109.0, 45],
  QCOM:  ["Qualcomm Inc.",                "Technology", 161.9,  175,  17.4, 230.6, 146.3, 8],
  TXN:   ["Texas Instruments Inc.",       "Technology", 198.3,  180,  36.7, 221.0, 156.5, 5],
  INTC:  ["Intel Corp.",                  "Technology",  24.1,  103,  -1.0,  51.3,  18.5, 55],
  NOW:   ["ServiceNow Inc.",              "Technology", 968.5,  198, 100.1, 1198.1, 744.1, 2],
  INTU:  ["Intuit Inc.",                  "Technology", 641.3,  179,  54.7, 693.9, 542.9, 2],
  PANW:  ["Palo Alto Networks",           "Technology", 374.2,  123,  48.2, 380.8, 254.4, 5],
  CRWD:  ["CrowdStrike Holdings",         "Technology", 374.0,   91,  80.1, 398.1, 197.6, 5],
  AMAT:  ["Applied Materials Inc.",       "Technology", 196.9,  167,  25.0, 255.5, 163.5, 8],
  LRCX:  ["Lam Research Corp.",           "Technology", 889.0,  118,  25.6, 1135.2, 745.3, 2],
  KLAC:  ["KLA Corp.",                    "Technology", 721.0,   97,  27.3, 852.3,  565.0, 2],
  MU:    ["Micron Technology Inc.",       "Technology",  82.4,   91,  17.1, 157.5,  79.3, 22],
  ASML:  ["ASML Holding NV",             "Technology", 784.3,  308,  43.1, 1110.1, 640.2, 1],
  SNOW:  ["Snowflake Inc.",               "Technology", 137.2,   47,  -1.0, 237.7, 107.1, 8],
  NET:   ["Cloudflare Inc.",              "Technology",  98.4,   32,  -1.0, 131.8,  55.5, 6],
  DDOG:  ["Datadog Inc.",                 "Technology", 121.9,   39,  -1.0, 147.5,  84.3, 4],
  TEAM:  ["Atlassian Corp.",              "Technology", 241.8,   61,  -1.0, 287.9, 151.7, 2],
  WDAY:  ["Workday Inc.",                 "Technology", 259.1,   54,  -1.0, 299.5, 197.4, 3],
  FTNT:  ["Fortinet Inc.",                "Technology",  71.4,   55,  30.2,  87.5,  54.4, 8],
  ZS:    ["Zscaler Inc.",                 "Technology", 186.2,   28,  -1.0, 269.3, 142.7, 3],
  CDNS:  ["Cadence Design Systems",       "Technology", 296.4,   80,  70.2, 311.3, 241.5, 2],
  SNPS:  ["Synopsys Inc.",                "Technology", 492.6,   77,  49.6, 607.8, 425.9, 1],
  MRVL:  ["Marvell Technology Inc.",      "Technology",  91.7,   78,  72.1, 119.9,  50.8, 18],
  ADI:   ["Analog Devices Inc.",          "Technology", 227.1,   119, 47.1, 244.0, 173.8, 4],
  MCHP:  ["Microchip Technology",         "Technology",  47.8,   26,  -1.0,  99.4,  43.6, 7],
  NXPI:  ["NXP Semiconductors",           "Technology", 238.4,   61,  21.4, 271.8, 180.2, 3],
  SWKS:  ["Skyworks Solutions",           "Technology",  88.1,   14,  13.7, 132.8,  82.3, 3],
  STX:   ["Seagate Technology",           "Technology",  98.3,   22,  18.3, 117.3,  71.8, 3],
  WDC:   ["Western Digital Corp.",        "Technology",  57.4,   19,  -1.0,  79.1,  37.1, 5],
  HPQ:   ["HP Inc.",                      "Technology",  29.4,   29,  10.1,  36.5,  25.4, 10],
  HPE:   ["Hewlett Packard Enterprise",   "Technology",  21.3,   28,  12.2,  24.4,  16.1, 12],
  DELL:  ["Dell Technologies Inc.",       "Technology", 138.9,   99,  18.4, 179.8,  95.0, 7],
  IBM:   ["IBM Corp.",                    "Technology", 236.6,   218, 32.9, 241.8, 155.0, 5],
  CSCO:  ["Cisco Systems Inc.",           "Technology",  62.8,   257, 25.3,  68.9,  44.5, 15],
  AKAM:  ["Akamai Technologies",          "Technology", 103.8,   15,  26.2, 124.6,  81.8, 2],
  SPLK:  ["Splunk Inc.",                  "Technology", 152.1,   25,  -1.0, 172.2, 104.0, 3],
  VEEV:  ["Veeva Systems Inc.",           "Technology", 222.1,   36,  45.3, 262.5, 174.6, 1],
  ANSS:  ["ANSYS Inc.",                   "Technology", 320.5,   27,  62.7, 388.9, 258.8, 1],
  TYL:   ["Tyler Technologies",           "Technology", 551.3,   23, 101.4, 609.4, 395.8, 1],
  EPAM:  ["EPAM Systems Inc.",            "Technology", 175.6,   10,  48.2, 315.9, 154.7, 1],
  CTSH:  ["Cognizant Technology",         "Technology",  82.4,   43,  16.4,  88.0,  57.7, 4],
  INFY:  ["Infosys Ltd.",                 "Technology",  19.1,   79,  22.1,  22.7,  14.5, 12],
  ACN:   ["Accenture PLC",               "Technology", 345.0,  217,  29.1, 409.0, 258.8, 4],
  GLOB:  ["Globant S.A.",                 "Technology", 188.4,    7,  62.4, 275.8, 148.8, 1],
  GFS:   ["GlobalFoundries Inc.",         "Technology",  38.2,   21,  -1.0,  60.4,  34.2, 2],
  CIEN:  ["Ciena Corp.",                  "Technology",  60.4,    9,  31.8,  72.0,  44.6, 2],
  JNPR:  ["Juniper Networks",             "Technology",  39.2,   12,  32.7,  42.5,  28.7, 4],
  ANET:  ["Arista Networks Inc.",         "Technology", 368.5,  114,  45.6, 421.8, 218.6, 3],
  FICO:  ["Fair Isaac Corp.",             "Technology", 1826.0,  110, 83.4, 2200.0, 1188.2, 1],
  PODD:  ["Insulet Corp.",                "Technology", 218.6,   15,  -1.0, 303.4, 179.6, 1],
  SMCI:  ["Super Micro Computer",         "Technology",  40.3,   23, -1.0,  122.9,  22.5, 20],
  ARM:   ["ARM Holdings PLC",            "Technology", 126.3,  133, 118.4, 188.8,  48.1, 10],
  ONTO:  ["Onto Innovation Inc.",         "Technology", 182.4,    5,  31.7, 231.6, 144.3, 1],
  MPWR:  ["Monolithic Power Systems",     "Technology", 681.3,   32,  55.3, 868.3, 492.7, 1],
  GEN:   ["Gen Digital Inc.",             "Technology",  22.5,   13,  16.4,  25.9,  19.0, 6],
  GDDY:  ["GoDaddy Inc.",                 "Technology", 183.7,   22,  26.8, 186.0, 108.0, 2],
  RBRK:  ["Rubrik Inc.",                  "Technology",  60.4,   15,  -1.0,  75.5,  25.5, 3],
  CELH:  ["Celsius Holdings",             "Technology",  33.3,    5,  -1.0, 100.5,  27.1, 5],
  PLTR:  ["Palantir Technologies",        "Technology",  27.8,   58,  -1.0,  31.5,  15.7, 58],

  // ── Financials (50) ──────────────────────────────────────────────────────────
  BRK_B: ["Berkshire Hathaway (B)",       "Financials", 468.2, 685,  10.2, 494.2, 357.3, 4],
  JPM:   ["JPMorgan Chase & Co.",         "Financials", 247.5, 712,  12.4, 260.9, 179.2, 8],
  BAC:   ["Bank of America Corp.",        "Financials",  42.4, 330,  13.8,  45.5,  31.0, 38],
  WFC:   ["Wells Fargo & Co.",            "Financials",  73.8, 247,  14.2,  78.7,  45.4, 20],
  GS:    ["Goldman Sachs Group",          "Financials", 587.4, 196,  14.6, 621.4, 413.9, 3],
  MS:    ["Morgan Stanley",               "Financials", 113.8, 186,  19.8, 121.9,  82.6, 10],
  C:     ["Citigroup Inc.",               "Financials",  71.2, 136,  15.1,  82.4,  52.5, 18],
  BLK:   ["BlackRock Inc.",               "Financials", 1025.3, 153, 24.3, 1093.0, 752.9, 1],
  SCHW:  ["Charles Schwab Corp.",         "Financials",  77.8, 139,  29.5,  88.0,  48.3, 12],
  AXP:   ["American Express Co.",         "Financials", 285.7, 200,  19.8, 298.4, 196.3, 4],
  V:     ["Visa Inc.",                    "Financials", 338.1, 698,  29.1, 354.9, 252.8, 6],
  MA:    ["Mastercard Inc.",              "Financials", 535.6, 503,  36.1, 558.9, 398.1, 4],
  PYPL:  ["PayPal Holdings Inc.",         "Financials",  71.4,  72,  17.8,  82.4,  55.2, 10],
  DFS:   ["Discover Financial Services",  "Financials", 194.3,  30,  14.1, 213.6, 113.9, 3],
  COF:   ["Capital One Financial",        "Financials", 183.9,  68,  12.3, 198.4, 107.2, 4],
  SYF:   ["Synchrony Financial",          "Financials",  51.3,  19,  8.9,  55.8,  32.7, 5],
  ALLY:  ["Ally Financial Inc.",          "Financials",  35.2,  10,  9.4,  44.4,  24.5, 5],
  SPGI:  ["S&P Global Inc.",              "Financials", 524.3, 162,  45.6, 541.9, 380.0, 2],
  MCO:   ["Moody's Corp.",                "Financials", 487.3,  87,  42.4, 524.8, 349.2, 1],
  ICE:   ["Intercontinental Exchange",    "Financials", 166.4, 94,  31.8, 172.8, 120.5, 4],
  CME:   ["CME Group Inc.",               "Financials", 222.3,  79,  24.1, 237.4, 183.1, 3],
  NDAQ:  ["Nasdaq Inc.",                  "Financials",  71.4,  40,  29.5,  75.8,  48.0, 6],
  BX:    ["Blackstone Inc.",              "Financials", 149.7, 103,  38.2, 165.0, 105.6, 5],
  KKR:   ["KKR & Co. Inc.",              "Financials", 130.4, 116,  30.1, 139.9,  68.2, 5],
  APO:   ["Apollo Global Management",     "Financials", 117.8,  68,  -1.0, 131.7,  72.0, 3],
  BAM:   ["Brookfield Asset Management",  "Financials",  56.1,  90,  28.7,  58.8,  35.1, 3],
  BN:    ["Brookfield Corp.",             "Financials",  52.4, 80,  32.1,  56.0,  35.5, 4],
  FNF:   ["Fidelity National Financial",  "Financials",  52.9,  14,  6.7,  61.4,  41.5, 2],
  FAF:   ["First American Financial",     "Financials",  55.6,   6,  15.4,  67.0,  45.7, 1],
  CBOE:  ["Cboe Global Markets",          "Financials", 199.3,  22,  21.5, 211.4, 156.2, 1],
  RJF:   ["Raymond James Financial",      "Financials", 137.4,  20,  14.7, 151.0, 102.4, 2],
  LPLA:  ["LPL Financial Holdings",       "Financials", 297.6,  12,  16.8, 358.9, 198.6, 2],
  COIN:  ["Coinbase Global Inc.",         "Financials", 238.3,  57,  -1.0, 349.7,  55.9, 8],
  HIG:   ["Hartford Financial Services",  "Financials", 117.8,  23,  12.3, 126.3,  83.4, 2],
  TRV:   ["Travelers Companies Inc.",     "Financials", 264.9,  37,  10.4, 267.2, 189.2, 2],
  ALL:   ["Allstate Corp.",               "Financials", 193.4,  47,  8.8, 202.5, 135.1, 2],
  CB:    ["Chubb Ltd.",                   "Financials", 279.6,  110, 12.9, 294.8, 218.7, 2],
  PGR:   ["Progressive Corp.",            "Financials", 259.3, 153,  16.3, 264.6, 175.7, 3],
  MET:   ["MetLife Inc.",                 "Financials",  72.4,  46,  8.7,  80.7,  60.2, 5],
  PRU:   ["Prudential Financial",         "Financials", 119.3,  44,  8.2, 127.7,  89.3, 4],
  AFL:   ["Aflac Inc.",                   "Financials", 104.3,  47,  11.8, 113.5,  77.1, 4],
  AIG:   ["American Intl Group",          "Financials",  75.3,  45,  -1.0,  82.0,  59.4, 5],
  LNC:   ["Lincoln National Corp.",       "Financials",  32.9,   8,  7.4,  38.9,  23.8, 4],
  CINF:  ["Cincinnati Financial",         "Financials", 129.7,  20,  10.4, 147.6, 108.5, 1],
  WRB:   ["W.R. Berkley Corp.",           "Financials",  57.8,  14,  13.2,  65.3,  46.4, 2],
  ERIE:  ["Erie Indemnity Co.",           "Financials", 421.3,  22,  35.6, 458.4, 285.9, 1],
  AON:   ["Aon PLC",                      "Financials", 371.8,  75,  27.6, 388.4, 278.5, 1],
  MMC:   ["Marsh & McLennan Companies",   "Financials", 224.5, 113,  29.4, 233.2, 177.9, 2],
  WTW:   ["Willis Towers Watson",         "Financials", 289.1,  28,  32.1, 301.3, 228.0, 1],
  GWO:   ["Great-West Lifeco Inc.",       "Financials",  37.8,  34,  12.1,  39.4,  28.4, 1],
  NTRS:  ["Northern Trust Corp.",         "Financials",  96.4,  15,  13.2, 111.3,  82.8, 2],

  // ── Healthcare (45) ──────────────────────────────────────────────────────────
  UNH:   ["UnitedHealth Group",           "Healthcare", 541.3,  500, 22.3, 594.4, 439.4, 4],
  LLY:   ["Eli Lilly & Co.",              "Healthcare", 878.6, 833,  76.8, 972.8, 468.3, 5],
  JNJ:   ["Johnson & Johnson",            "Healthcare", 156.8, 377,  22.4, 168.7, 143.1, 8],
  MRK:   ["Merck & Co. Inc.",             "Healthcare", 125.7, 318,  18.1, 134.6, 100.5, 8],
  ABBV:  ["AbbVie Inc.",                  "Healthcare", 187.4, 330,  20.8, 200.2, 137.0, 6],
  PFE:   ["Pfizer Inc.",                  "Healthcare",  27.3, 155,  -1.0,  33.2,  24.5, 30],
  TMO:   ["Thermo Fisher Scientific",     "Healthcare", 548.4, 208,  29.1, 625.1, 462.2, 2],
  ABT:   ["Abbott Laboratories",          "Healthcare", 125.4, 217,  31.3, 127.3, 100.7, 8],
  DHR:   ["Danaher Corp.",                "Healthcare", 233.1, 166,  38.2, 292.4, 185.9, 4],
  AMGN:  ["Amgen Inc.",                   "Healthcare", 303.7, 163,  20.8, 337.3, 254.4, 4],
  GILD:  ["Gilead Sciences Inc.",         "Healthcare",  97.9, 122,  26.9, 101.6,  63.3, 8],
  REGN:  ["Regeneron Pharmaceuticals",    "Healthcare", 882.4,  96,  21.4, 1189.0, 730.0, 1],
  VRTX:  ["Vertex Pharmaceuticals",       "Healthcare", 487.3,  125, 28.4, 519.1, 345.4, 2],
  BIIB:  ["Biogen Inc.",                  "Healthcare", 176.8,  26,  8.4, 290.3, 149.7, 2],
  MRNA:  ["Moderna Inc.",                 "Healthcare",  56.4,  22,  -1.0, 175.0,  49.1, 8],
  ISRG:  ["Intuitive Surgical Inc.",      "Healthcare", 527.3, 186,  72.3, 543.1, 358.1, 2],
  BSX:   ["Boston Scientific Corp.",      "Healthcare",  87.4, 129,  69.1, 90.0,  55.5, 12],
  MDT:   ["Medtronic PLC",               "Healthcare",  90.7, 121,  26.3, 101.3,  78.4, 8],
  SYK:   ["Stryker Corp.",                "Healthcare", 385.4, 146,  47.8, 397.5, 282.9, 3],
  EW:    ["Edwards Lifesciences",         "Healthcare",  65.3,  41,  36.8, 104.5,  60.7, 5],
  BDX:   ["Becton Dickinson & Co.",       "Healthcare", 222.1,  64,  27.3, 263.9, 207.4, 2],
  ZBH:   ["Zimmer Biomet Holdings",       "Healthcare", 102.9,  12,  20.3, 132.8,  96.0, 2],
  DXCM:  ["Dexcom Inc.",                  "Healthcare",  77.8,  30,  -1.0, 139.2,  63.5, 6],
  IDXX:  ["IDEXX Laboratories",           "Healthcare", 486.4,  40,  45.7, 573.4, 381.4, 1],
  IQV:   ["IQVIA Holdings Inc.",          "Healthcare", 227.6,  41,  31.8, 249.9, 173.4, 2],
  CRL:   ["Charles River Laboratories",   "Healthcare", 198.5,  10,  28.1, 278.0, 143.8, 1],
  HOLX:  ["Hologic Inc.",                 "Healthcare",  65.8,   9,  15.4,  89.6,  61.9, 2],
  ALGN:  ["Align Technology Inc.",        "Healthcare", 235.6,  18,  44.2, 342.3, 153.3, 1],
  CVS:   ["CVS Health Corp.",             "Healthcare",  66.4,  84,  -1.0,  83.4,  55.0, 12],
  CI:    ["Cigna Group",                  "Healthcare", 347.2,  85,  12.6, 387.2, 279.6, 3],
  HUM:   ["Humana Inc.",                  "Healthcare", 268.1,  33,  30.3, 553.4, 246.9, 2],
  MOH:   ["Molina Healthcare Inc.",       "Healthcare", 311.2,  17,  16.4, 411.0, 273.8, 1],
  CNC:   ["Centene Corp.",                "Healthcare",  62.8,  34,  8.1,  83.6,  56.0, 5],
  ELV:   ["Elevance Health Inc.",         "Healthcare", 418.8, 96,  13.6, 551.4, 378.2, 2],
  WBA:   ["Walgreens Boots Alliance",     "Healthcare",  11.1,  10,  -1.0,  21.9,   8.7, 10],
  RVMD:  ["Revolution Medicines",         "Healthcare",  62.4,   7,  -1.0,  73.0,  24.3, 3],
  NTRA:  ["Natera Inc.",                  "Healthcare",  171.2,  14,  -1.0, 173.6,  57.6, 3],
  BAX:   ["Baxter International",         "Healthcare",  35.8,  19,  -1.0,  53.2,  31.0, 5],
  COO:   ["Cooper Companies Inc.",        "Healthcare",  86.5,   4,  32.7, 119.7,  72.5, 1],
  VTRS:  ["Viatris Inc.",                 "Healthcare",  12.2,   9,  5.8,  12.7,   8.9, 8],
  ZTS:   ["Zoetis Inc.",                  "Healthcare", 157.3,  72,  30.1, 198.9, 148.4, 3],
  MTD:   ["Mettler-Toledo Intl",          "Healthcare", 1373.5,  33, 35.1, 1617.4, 1093.8, 0],
  WST:   ["West Pharmaceutical Services","Healthcare", 358.4,  26,  42.7, 450.5, 287.0, 1],
  PODD2: ["Insulet Corp.",                "Healthcare", 218.6,  15,  -1.0, 303.4, 179.6, 1],
  HSIC:  ["Henry Schein Inc.",            "Healthcare",  72.3,  10,  16.4,  89.4,  63.7, 2],

  // ── Consumer Discretionary (40) ───────────────────────────────────────────────
  AMZN:  ["Amazon.com Inc.",              "Consumer",   198.6, 2110,  42.3, 230.0, 151.6, 36],
  TSLA:  ["Tesla Inc.",                   "Consumer",   248.7,  797,  95.6, 488.5, 138.8, 82],
  HD:    ["Home Depot Inc.",              "Consumer",   366.5,  370,  25.2, 408.4, 302.3, 5],
  MCD:   ["McDonald's Corp.",             "Consumer",   299.3,  217,  24.3, 318.7, 256.8, 5],
  NKE:   ["Nike Inc.",                    "Consumer",    76.4,  115,  22.3,  98.2,  70.2, 10],
  SBUX:  ["Starbucks Corp.",              "Consumer",    84.7,   94,  22.5, 105.8,  71.8, 8],
  TJX:   ["TJX Companies Inc.",           "Consumer",   114.2,  134,  26.5, 120.8,  87.1, 8],
  LOW:   ["Lowe's Companies Inc.",        "Consumer",   241.8,  144,  19.7, 272.0, 193.7, 5],
  TGT:   ["Target Corp.",                 "Consumer",   148.7,   69,  17.8, 183.0, 119.3, 6],
  BKNG:  ["Booking Holdings Inc.",        "Consumer",  4362.0,   96, 25.4, 4616.9, 2910.0, 1],
  CMG:   ["Chipotle Mexican Grill",       "Consumer",    56.8,  157,  59.7,  67.1,  37.7, 8],
  ROST:  ["Ross Stores Inc.",             "Consumer",   133.9,   46,  25.1, 163.0, 114.5, 4],
  DG:    ["Dollar General Corp.",         "Consumer",   108.4,   23,  16.5, 181.2,  97.5, 4],
  DLTR:  ["Dollar Tree Inc.",             "Consumer",   107.5,   22,  -1.0, 162.5,  100.0, 5],
  EBAY:  ["eBay Inc.",                    "Consumer",    57.3,   24,  13.4,  58.5,  41.0, 5],
  ETSY:  ["Etsy Inc.",                    "Consumer",    54.4,    6,  16.5, 105.6,  49.3, 3],
  ABNB:  ["Airbnb Inc.",                  "Consumer",   156.8,   98,  19.8, 171.7, 113.2, 5],
  MAR:   ["Marriott International",       "Consumer",   271.4,   65,  22.4, 296.4, 205.0, 3],
  HLT:   ["Hilton Worldwide Holdings",    "Consumer",   266.4,   52,  44.6, 281.4, 189.4, 2],
  GM:    ["General Motors Co.",           "Consumer",    50.3,   44,  5.7,  57.8,  41.5, 18],
  F:     ["Ford Motor Co.",               "Consumer",    10.4,   41,  11.2,  13.1,   9.6, 55],
  RIVN:  ["Rivian Automotive Inc.",       "Consumer",    11.2,   11,  -1.0,  20.5,   8.3, 18],
  LCID:  ["Lucid Group Inc.",             "Consumer",     2.2,    7,  -1.0,   4.9,   1.8, 20],
  LVS:   ["Las Vegas Sands Corp.",        "Consumer",    47.3,   36,  26.8,  59.9,  38.3, 5],
  MGM:   ["MGM Resorts International",    "Consumer",    45.8,   13,  -1.0,  55.9,  34.4, 6],
  WYNN:  ["Wynn Resorts Ltd.",            "Consumer",    99.8,   11,  22.1, 120.0,  82.3, 2],
  RCL:   ["Royal Caribbean Cruises",      "Consumer",   198.7,   52,  17.8, 226.8, 118.0, 5],
  CCL:   ["Carnival Corp.",               "Consumer",    20.2,   24,  13.2,  23.3,  13.1, 18],
  NCLH:  ["Norwegian Cruise Line",        "Consumer",    18.3,    7,  12.3,  22.0,  11.1, 10],
  YUM:   ["Yum! Brands Inc.",             "Consumer",   133.4,   37,  23.7, 141.5, 110.5, 3],
  DRI:   ["Darden Restaurants Inc.",      "Consumer",   165.9,   18,  18.3, 178.8, 142.0, 2],
  ULTA:  ["Ulta Beauty Inc.",             "Consumer",   392.4,   20,  17.9, 582.5, 343.9, 1],
  LULU:  ["Lululemon Athletica",          "Consumer",   291.3,   37,  25.4, 516.3, 234.8, 2],
  TPR:   ["Tapestry Inc.",                "Consumer",    38.4,    9,  10.3,  50.7,  29.6, 4],
  RL:    ["Ralph Lauren Corp.",           "Consumer",   204.5,   11,  18.9, 218.4, 142.9, 1],
  VFC:   ["VF Corp.",                     "Consumer",    11.2,    4,  -1.0,  18.8,   7.6, 5],
  CPRI:  ["Capri Holdings Ltd.",          "Consumer",    23.8,    2,  -1.0,  48.8,  17.2, 3],
  HAS:   ["Hasbro Inc.",                  "Consumer",    55.4,    7,  -1.0,  72.6,  40.6, 2],
  MAT:   ["Mattel Inc.",                  "Consumer",    18.9,    6,  12.4,  24.1,  16.0, 4],
  POOL:  ["Pool Corp.",                   "Consumer",   350.5,   14,  29.1, 401.0, 282.0, 1],

  // ── Consumer Staples (25) ─────────────────────────────────────────────────────
  WMT:   ["Walmart Inc.",                 "Consumer Staples", 89.2,  717,  33.4, 105.3, 60.6, 12],
  COST:  ["Costco Wholesale Corp.",       "Consumer Staples", 893.4, 396,  55.4, 1007.7, 720.0, 3],
  PG:    ["Procter & Gamble Co.",         "Consumer Staples", 168.9, 398,  27.4, 179.3, 150.5, 8],
  KO:    ["Coca-Cola Co.",                "Consumer Staples",  68.1, 293,  24.2,  73.5,  55.2, 12],
  PEP:   ["PepsiCo Inc.",                 "Consumer Staples", 161.9, 222,  22.8, 196.8, 155.8, 6],
  PM:    ["Philip Morris Intl",           "Consumer Staples", 130.3, 201,  18.7, 134.5,  86.1, 6],
  MO:    ["Altria Group Inc.",            "Consumer Staples",  44.3,  77,  8.6,  46.9,  38.5, 8],
  MDLZ:  ["Mondelez International",       "Consumer Staples",  66.8,  91,  20.8,  77.2,  62.5, 5],
  CL:    ["Colgate-Palmolive Co.",        "Consumer Staples", 101.3, 85,  26.8, 105.5,  79.5, 5],
  KMB:   ["Kimberly-Clark Corp.",         "Consumer Staples", 135.7,  45,  22.7, 147.9, 120.3, 3],
  CHD:   ["Church & Dwight Co.",          "Consumer Staples", 102.4,  25,  37.6, 111.9,  90.3, 2],
  CLX:   ["Clorox Co.",                   "Consumer Staples", 156.4,  19,  33.8, 170.5, 129.8, 2],
  HRL:   ["Hormel Foods Corp.",           "Consumer Staples",  29.7,  16,  22.2,  38.9,  28.5, 4],
  K:     ["Kellanova",                    "Consumer Staples",  80.1,  27,  28.3,  83.0,  51.5, 2],
  CPB:   ["Campbell Soup Co.",            "Consumer Staples",  38.2,  11,  14.2,  51.4,  36.8, 3],
  GIS:   ["General Mills Inc.",           "Consumer Staples",  58.3,  34,  13.4,  68.6,  55.0, 4],
  CAG:   ["Conagra Brands Inc.",          "Consumer Staples",  26.3,  12,  11.3,  37.5,  23.8, 5],
  MKC:   ["McCormick & Company",          "Consumer Staples",  71.4,  19,  28.5,  93.3,  68.7, 3],
  TSN:   ["Tyson Foods Inc.",             "Consumer Staples",  55.4,  20,  -1.0,  68.7,  46.5, 3],
  KHC:   ["Kraft Heinz Co.",              "Consumer Staples",  31.2,  38,  10.3,  38.3,  28.9, 8],
  SJM:   ["J.M. Smucker Co.",             "Consumer Staples", 107.3,  11,  15.4, 150.4, 103.0, 2],
  MNST:  ["Monster Beverage Corp.",       "Consumer Staples",  52.4,  52,  30.1,  63.2,  44.9, 4],
  STZ:   ["Constellation Brands Inc.",    "Consumer Staples", 238.4,  44,  20.5, 268.0, 210.5, 2],
  TAP:   ["Molson Coors Beverage",        "Consumer Staples",  61.3,  13,  11.4,  73.5,  58.0, 2],
  SAM:   ["Boston Beer Co. Inc.",         "Consumer Staples", 337.4,   4,  28.1, 421.3, 277.7, 1],

  // ── Energy (25) ───────────────────────────────────────────────────────────────
  XOM:   ["Exxon Mobil Corp.",            "Energy", 115.3,  462,  14.1, 123.8,  94.3, 18],
  CVX:   ["Chevron Corp.",                "Energy", 154.8,  279,  15.7, 176.0, 136.1, 8],
  COP:   ["ConocoPhillips",               "Energy", 109.6,  132,  13.4, 135.9,  95.9, 8],
  EOG:   ["EOG Resources Inc.",           "Energy", 131.3,   76,  11.1, 141.4, 108.5, 4],
  SLB:   ["SLB (Schlumberger)",           "Energy",  40.2,   57,  13.4,  59.8,  37.5, 18],
  OXY:   ["Occidental Petroleum",         "Energy",  48.4,   41,  18.1,  71.2,  45.3, 12],
  MPC:   ["Marathon Petroleum Corp.",     "Energy", 166.5,  54,  9.4, 216.6, 148.8, 5],
  VLO:   ["Valero Energy Corp.",          "Energy", 147.8,  48,  7.8, 185.5, 131.5, 5],
  PSX:   ["Phillips 66",                  "Energy", 149.8,  50,  8.8, 178.5, 130.0, 4],
  HAL:   ["Halliburton Co.",              "Energy",  31.2,  28,  10.8,  41.3,  29.2, 12],
  DVN:   ["Devon Energy Corp.",           "Energy",  37.8,  23,  8.8,  55.8,  34.0, 10],
  FANG:  ["Diamondback Energy",           "Energy", 182.4,  33,  11.4, 208.8, 164.8, 3],
  PR:    ["Permian Resources Corp.",       "Energy",  15.4,  10,  13.1,  19.2,  13.5, 5],
  MRO:   ["Marathon Oil Corp.",           "Energy",  24.1,  14,  9.4,  31.0,  21.2, 8],
  APA:   ["APA Corp.",                    "Energy",  19.3,   7,  5.4,  30.3,  17.5, 7],
  EQT:   ["EQT Corp.",                    "Energy",  43.8,  14,  13.7,  59.2,  35.5, 6],
  AR:    ["Antero Resources Corp.",        "Energy",  30.4,   8,  -1.0,  43.1,  20.8, 5],
  CNX:   ["CNX Resources Corp.",          "Energy",  22.8,   3,  7.1,  30.0,  18.4, 4],
  MTDR:  ["Matador Resources Co.",        "Energy",  57.4,   7,  7.7,  79.1,  44.3, 2],
  CTRA:  ["Coterra Energy Inc.",          "Energy",  28.3,  21,  10.8,  37.0,  26.2, 8],
  SM:    ["SM Energy Co.",                "Energy",  30.4,   4,  5.4,  48.0,  24.3, 3],
  HES:   ["Hess Corp.",                   "Energy", 157.8,  47,  28.3, 168.6, 127.2, 3],
  BKR:   ["Baker Hughes Co.",             "Energy",  40.8,  41,  22.4,  42.0,  31.2, 8],
  CHRD:  ["Chord Energy Corp.",           "Energy", 116.8,  10,  5.7, 187.8, 107.2, 2],
  VTLE:  ["Vital Energy Inc.",            "Energy",  27.4,   2,  3.4,  72.0,  22.4, 2],

  // ── Industrials (35) ─────────────────────────────────────────────────────────
  GE:    ["GE Aerospace",                 "Industrials", 198.4,  213, 36.4, 214.6,  107.5, 8],
  HON:   ["Honeywell International",      "Industrials", 213.5,  142, 24.3, 229.0, 183.8, 6],
  CAT:   ["Caterpillar Inc.",             "Industrials", 328.4,  162, 16.3, 418.5, 285.0, 4],
  DE:    ["Deere & Company",              "Industrials", 408.5,  121, 12.3, 467.7, 338.4, 3],
  UPS:   ["United Parcel Service",        "Industrials", 115.4,   99, 17.8, 183.5, 107.2, 6],
  FDX:   ["FedEx Corp.",                  "Industrials", 274.3,   71, 16.2, 313.5, 220.9, 4],
  LMT:   ["Lockheed Martin Corp.",        "Industrials", 509.3,  123, 19.4, 607.9, 415.1, 2],
  RTX:   ["RTX Corp.",                    "Industrials", 122.4,  161, 43.8, 131.0,  88.3, 8],
  BA:    ["Boeing Co.",                   "Industrials", 192.4,  116, -1.0, 267.5, 159.7, 6],
  NOC:   ["Northrop Grumman Corp.",       "Industrials", 519.4,   80, 17.6, 551.3, 440.3, 1],
  GD:    ["General Dynamics Corp.",       "Industrials", 297.8,   81, 20.4, 318.5, 248.5, 2],
  AXON:  ["Axon Enterprise Inc.",         "Industrials", 615.4,   43, 71.8, 651.9, 262.8, 2],
  LHX:   ["L3Harris Technologies",        "Industrials", 228.4,   43, 23.8, 250.0, 183.4, 2],
  TDG:   ["TransDigm Group Inc.",         "Industrials", 1336.5,   74, 50.1, 1427.3, 1015.0, 1],
  GWW:   ["W.W. Grainger Inc.",           "Industrials", 1095.3,   52, 28.4, 1189.0, 828.5, 1],
  ROK:   ["Rockwell Automation",          "Industrials", 248.5,   28, 22.1, 323.6, 228.4, 2],
  EMR:   ["Emerson Electric Co.",         "Industrials", 109.8,   64, 28.3, 118.1,  94.3, 4],
  ETN:   ["Eaton Corp. PLC",             "Industrials", 291.5,  115, 30.1, 372.5, 236.6, 3],
  PH:    ["Parker-Hannifin Corp.",        "Industrials", 650.3,   83, 26.3, 762.8, 480.0, 2],
  ITW:   ["Illinois Tool Works",          "Industrials", 256.4,   78, 22.8, 280.8, 218.4, 3],
  SWK:   ["Stanley Black & Decker",       "Industrials",  79.8,   12, 24.6, 108.7,  73.0, 4],
  MMM:   ["3M Co.",                       "Industrials", 129.3,   70, -1.0, 138.7,  92.0, 5],
  ROP:   ["Roper Technologies",           "Industrials", 615.4,   64, 42.1, 649.0, 483.6, 1],
  OTIS:  ["Otis Worldwide Corp.",         "Industrials",  96.4,   40, 27.4, 102.3,  79.5, 3],
  CARR:  ["Carrier Global Corp.",         "Industrials",  69.4,   58, 22.4,  77.6,  55.3, 6],
  XYL:   ["Xylem Inc.",                   "Industrials", 127.8,   23, 39.1, 143.8, 107.6, 2],
  IEX:   ["IDEX Corp.",                   "Industrials", 225.4,   18, 26.1, 252.4, 197.8, 1],
  FTV:   ["Fortive Corp.",                "Industrials",  81.4,   26, 24.3,  91.8,  67.6, 3],
  CTAS:  ["Cintas Corp.",                 "Industrials", 190.2,   73, 44.8, 205.3, 127.9, 2],
  FAST:  ["Fastenal Co.",                 "Industrials",  72.1,   41, 32.4,  80.5,  57.3, 5],
  HUBB:  ["Hubbell Inc.",                 "Industrials", 411.3,   22, 24.7, 483.7, 329.4, 1],
  GNRC:  ["Generac Holdings Inc.",        "Industrials", 141.4,    9, 26.7, 323.0, 115.2, 2],
  VLTO:  ["Veralto Corp.",                "Industrials",  97.4,   26, 27.1, 113.6,  79.9, 2],
  LDOS:  ["Leidos Holdings Inc.",         "Industrials", 167.8,   22, 20.4, 191.8, 126.4, 2],
  BAH:   ["Booz Allen Hamilton",          "Industrials", 148.5,   19, 22.8, 165.5, 117.8, 2],

  // ── Materials (20) ────────────────────────────────────────────────────────────
  LIN:   ["Linde PLC",                    "Materials", 471.3,  227, 31.4, 484.1, 386.6, 2],
  APD:   ["Air Products & Chemicals",     "Materials", 304.5,   66, 24.3, 326.4, 269.0, 2],
  SHW:   ["Sherwin-Williams Co.",         "Materials", 354.2,   90, 31.8, 387.4, 277.6, 3],
  ECL:   ["Ecolab Inc.",                  "Materials", 246.8,   70, 40.3, 256.4, 192.8, 2],
  DD:    ["DuPont de Nemours",            "Materials",  82.8,   22, 26.7,  92.0,  63.1, 4],
  NEM:   ["Newmont Corp.",                "Materials",  49.3,   40, 22.1,  56.4,  32.0, 8],
  FCX:   ["Freeport-McMoRan Inc.",        "Materials",  47.8,   68, 20.3,  55.0,  34.0, 18],
  NUE:   ["Nucor Corp.",                  "Materials", 161.3,   20,  6.4, 220.4, 147.7, 3],
  STLD:  ["Steel Dynamics Inc.",          "Materials", 117.4,   16,  7.8, 147.3, 106.5, 2],
  CLF:   ["Cleveland-Cliffs Inc.",        "Materials",  12.4,   6,  -1.0,  24.2,  11.8, 12],
  X:     ["United States Steel Corp.",    "Materials",  35.2,   6,  -1.0,  46.8,  30.2, 8],
  AA:    ["Alcoa Corp.",                  "Materials",  35.2,    6, 22.4,  47.1,  21.2, 5],
  VMC:   ["Vulcan Materials Co.",         "Materials", 261.4,   34, 31.4, 282.4, 200.3, 2],
  MLM:   ["Martin Marietta Materials",   "Materials", 609.5,   41, 25.1, 668.5, 467.0, 1],
  PKG:   ["Packaging Corp. of America",   "Materials", 214.3,   15, 19.4, 228.5, 161.0, 1],
  IP:    ["International Paper Co.",      "Materials",  46.8,   17, 15.3,  55.2,  31.1, 4],
  WRK:   ["WestRock Co.",                 "Materials",  39.8,   10,  12.8, 47.2,  28.5, 4],
  SEE:   ["Sealed Air Corp.",             "Materials",  30.4,   6,  14.3,  46.3,  28.8, 3],
  IFF:   ["Intl Flavors & Fragrances",   "Materials",  82.9,   11,  -1.0, 112.5,  73.2, 3],
  CE:    ["Celanese Corp.",               "Materials",  89.8,   10,  5.4, 160.1,  74.8, 2],

  // ── Utilities (20) ────────────────────────────────────────────────────────────
  NEE:   ["NextEra Energy Inc.",          "Utilities",  71.4,  146, 18.4,  83.3,  61.0, 12],
  DUK:   ["Duke Energy Corp.",            "Utilities", 112.4,   87, 18.8, 122.2,  96.1, 5],
  SO:    ["Southern Co.",                 "Utilities",  82.4,   89, 23.4,  90.0,  66.4, 6],
  AEP:   ["American Electric Power",      "Utilities",  96.4,   50, 20.1, 103.5,  81.3, 3],
  XEL:   ["Xcel Energy Inc.",             "Utilities",  61.8,   33, 22.8,  73.6,  52.1, 4],
  EXC:   ["Exelon Corp.",                 "Utilities",  38.8,   38, 14.7,  45.0,  33.3, 8],
  PPL:   ["PPL Corp.",                    "Utilities",  32.4,   22, 16.8,  34.4,  26.3, 5],
  ED:    ["Consolidated Edison",          "Utilities",  94.4,   32, 18.2, 100.8,  84.3, 3],
  FE:    ["FirstEnergy Corp.",            "Utilities",  43.8,   26, 24.7,  47.3,  35.4, 5],
  WEC:   ["WEC Energy Group",             "Utilities",  84.8,   27, 20.3,  95.5,  73.9, 3],
  CMS:   ["CMS Energy Corp.",             "Utilities",  65.4,   19, 18.7,  72.4,  54.4, 3],
  ETR:   ["Entergy Corp.",                "Utilities", 122.4,   25, 18.2, 133.8,  97.5, 2],
  LNT:   ["Alliant Energy Corp.",         "Utilities",  56.4,   14, 18.9,  62.5,  47.4, 3],
  ATO:   ["Atmos Energy Corp.",           "Utilities", 135.4,   18, 19.4, 142.4, 111.8, 2],
  NI:    ["NiSource Inc.",                "Utilities",  33.8,   12, 18.8,  37.0,  27.0, 4],
  PNW:   ["Pinnacle West Capital",        "Utilities",  86.4,   9,  16.3,  93.5,  72.5, 2],
  AES:   ["AES Corp.",                    "Utilities",  15.8,   10, -1.0,  24.4,  14.0, 8],
  NRG:   ["NRG Energy Inc.",              "Utilities",  99.8,   12, -1.0, 101.8,  42.2, 3],
  VST:   ["Vistra Corp.",                 "Utilities", 118.3,   22, 12.4, 179.2,  39.9, 5],
  CEG:   ["Constellation Energy",         "Utilities", 278.3,   60, 26.4, 320.4,  97.8, 5],

  // ── Real Estate (20) ──────────────────────────────────────────────────────────
  PLD:   ["Prologis Inc.",                "Real Estate", 104.3,   97, 34.1, 133.4,  93.0, 6],
  AMT:   ["American Tower Corp.",         "Real Estate", 183.4,   85, 49.8, 229.5, 166.3, 4],
  CCI:   ["Crown Castle Inc.",            "Real Estate", 104.8,   45, 57.4, 148.0,  99.0, 4],
  EQIX:  ["Equinix Inc.",                 "Real Estate", 847.3,   76, 91.3, 968.0, 716.4, 1],
  SPG:   ["Simon Property Group",         "Real Estate", 161.4,   52, 17.3, 172.5, 123.5, 3],
  PSA:   ["Public Storage",               "Real Estate", 302.4,   53, 32.4, 341.8, 261.4, 2],
  O:     ["Realty Income Corp.",          "Real Estate",  55.3,   47, 42.6,  64.3,  51.0, 5],
  AVB:   ["AvalonBay Communities",        "Real Estate", 226.3,   32, 28.4, 238.5, 179.1, 2],
  EQR:   ["Equity Residential",           "Real Estate",  71.4,   27, 30.1,  78.8,  58.8, 4],
  DLR:   ["Digital Realty Trust",         "Real Estate", 152.4,   44, -1.0, 173.9, 112.3, 4],
  WELL:  ["Welltower Inc.",               "Real Estate",  99.4,   57, 72.6, 110.4,  75.9, 4],
  VTR:   ["Ventas Inc.",                  "Real Estate",  63.4,   26, -1.0,  67.4,  43.4, 4],
  MAA:   ["Mid-America Apartment",        "Real Estate", 149.4,   17, 25.4, 168.5, 133.0, 2],
  UDR:   ["UDR Inc.",                     "Real Estate",  38.8,   13, 56.4,  46.6,  31.1, 4],
  CPT:   ["Camden Property Trust",        "Real Estate", 113.4,    9, 30.2, 136.5,  98.9, 2],
  EXR:   ["Extra Space Storage",          "Real Estate", 148.4,   30, 22.4, 192.2, 126.8, 3],
  CUBE:  ["CubeSmart",                    "Real Estate",  43.8,    8, 35.2,  54.3,  38.5, 3],
  LSI:   ["Life Storage Inc.",            "Real Estate", 130.4,   12, 28.3, 145.5, 102.0, 2],
  NNN:   ["NNN REIT Inc.",                "Real Estate",  44.8,   10, 26.4,  50.7,  38.9, 3],
  WPC:   ["W. P. Carey Inc.",             "Real Estate",  62.4,   14, 23.7,  76.4,  58.2, 3],

  // ── Communication Services (20) ───────────────────────────────────────────────
  NFLX:  ["Netflix Inc.",                 "Communications", 1064.3,  454, 52.4, 1113.9, 588.1, 4],
  DIS:   ["Walt Disney Co.",              "Communications",  96.4,  175, 33.8, 123.7,  83.9, 8],
  CMCSA: ["Comcast Corp.",                "Communications",  41.4,  166, 10.4,  47.8,  36.8, 25],
  VZ:    ["Verizon Communications",       "Communications",  41.8,  175, 10.2,  44.5,  36.8, 18],
  T:     ["AT&T Inc.",                    "Communications",  19.3,  138,  9.8,  20.5,  15.3, 55],
  TMUS:  ["T-Mobile US Inc.",             "Communications", 238.4,  276, 24.3, 244.3, 148.3, 5],
  CHTR:  ["Charter Communications",       "Communications", 328.4,   36, 10.2, 532.2, 271.7, 2],
  PARA:  ["Paramount Global",             "Communications",  10.8,    7, -1.0,  22.3,   9.7, 5],
  WBD:   ["Warner Bros. Discovery",       "Communications",   9.4,   22, -1.0,  17.7,   7.2, 18],
  FOX:   ["Fox Corp.",                    "Communications",  42.8,   22,  9.4,  45.2,  27.5, 4],
  OMC:   ["Omnicom Group Inc.",           "Communications",  89.4,   18, 12.3,  98.6,  73.5, 3],
  IPG:   ["Interpublic Group",            "Communications",  29.4,   11, 11.4,  38.0,  27.5, 4],
  EA:    ["Electronic Arts Inc.",         "Communications", 130.3,   35, 26.4, 146.8, 108.4, 4],
  TTWO:  ["Take-Two Interactive",         "Communications", 209.4,   33, -1.0, 240.8, 120.5, 2],
  RBLX:  ["Roblox Corp.",                 "Communications",  44.8,   27, -1.0,  51.7,  24.0, 8],
  SNAP:  ["Snap Inc.",                    "Communications",  10.4,   17, -1.0,  17.9,   8.5, 25],
  PINS:  ["Pinterest Inc.",               "Communications",  32.4,   22, 40.4,  43.8,  23.5, 10],
  SPOT:  ["Spotify Technology SA",        "Communications", 392.4,   75, -1.0, 399.2, 136.6, 3],
  MTCH:  ["Match Group Inc.",             "Communications",  33.4,    9, 19.3,  53.6,  27.6, 4],
  ZM:    ["Zoom Video Communications",    "Communications",  64.8,   19, 19.3,  82.8,  56.3, 5],
};

// Market scenario modifier
type MarketState = "running" | "paused" | "flash_crash" | "bull" | "bear" | "volatile";
let marketState: MarketState = "running";
let isPaused = false;
let marketStartTime = Date.now();

// Live prices and tracking
const prices: Record<string, number> = {};
const openPrices: Record<string, number> = {};
const sessionVolumes: Record<string, number> = {};
const dayHighs: Record<string, number> = {};
const dayLows: Record<string, number> = {};

let ordersReceivedTotal = 0;
let ordersFilledTotal = 0;
let ordersRejectedTotal = 0;
let partialFillsTotal = 0;
let ordersPerSecond = 0;
let tradesPerSecond = 0;
let queueDepth = 0;

export const latencyStats = {
  gatewayUs: 42,
  queueUs: 125,
  matchingUs: 89,
  totalUs: 256,
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Initialize prices
for (const [sym, row] of Object.entries(SYMBOL_DATA)) {
  const basePrice = row[2];
  const jitter = rand(0.97, 1.03);
  prices[sym] = basePrice * jitter;
  openPrices[sym] = prices[sym];
  sessionVolumes[sym] = 0;
  dayHighs[sym] = prices[sym] * rand(1.001, 1.02);
  dayLows[sym] = prices[sym] * rand(0.98, 0.999);
}

function generateHistory(symbol: string, period: string): OhlcBar[] {
  const row = SYMBOL_DATA[symbol];
  if (!row) return [];
  const basePrice = row[2] as number;

  const periodsMap: Record<string, { count: number; intervalMs: number }> = {
    "1d":  { count: 78,  intervalMs: 5 * 60 * 1000 },
    "5d":  { count: 100, intervalMs: 30 * 60 * 1000 },
    "1mo": { count: 30,  intervalMs: 24 * 60 * 60 * 1000 },
    "3mo": { count: 65,  intervalMs: 24 * 60 * 60 * 1000 },
    "6mo": { count: 130, intervalMs: 24 * 60 * 60 * 1000 },
    "1y":  { count: 252, intervalMs: 24 * 60 * 60 * 1000 },
  };
  const cfg = periodsMap[period] ?? periodsMap["1d"];
  const now = Date.now();
  let price = basePrice * rand(0.85, 0.95);
  const bars: OhlcBar[] = [];

  for (let i = cfg.count; i >= 0; i--) {
    const ts = new Date(now - i * cfg.intervalMs);
    const drift = rand(-0.015, 0.018);
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * rand(1.001, 1.012);
    const low  = Math.min(open, close) * rand(0.988, 0.999);
    const volM = (row[7] as number) * rand(0.5, 1.8) / cfg.count;
    bars.push({
      timestamp: ts.toISOString(),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low:  +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(volM * 1_000_000),
    });
    price = close;
  }
  return bars;
}

// Tick prices every second
function tickPrices() {
  if (isPaused) return;

  const volMult: Record<MarketState, number> = {
    running: 0.001, paused: 0, flash_crash: 0.05, bull: 0.003, bear: 0.002, volatile: 0.008,
  };
  const vol = volMult[marketState] || 0.001;

  for (const sym of Object.keys(SYMBOL_DATA)) {
    let sign: number;
    if (marketState === "flash_crash") sign = -1;
    else if (marketState === "bull") sign = Math.random() > 0.3 ? 1 : -1;
    else if (marketState === "bear") sign = Math.random() > 0.7 ? 1 : -1;
    else sign = Math.random() > 0.5 ? 1 : -1;

    const move = rand(0, vol);
    prices[sym] = Math.max(prices[sym] * (1 + sign * move), 0.01);
    if (prices[sym] > dayHighs[sym]) dayHighs[sym] = prices[sym];
    if (prices[sym] < dayLows[sym]) dayLows[sym] = prices[sym];
    sessionVolumes[sym] += Math.round(rand(5_000, 200_000));
  }

  ordersPerSecond = Math.round(rand(180, 850));
  tradesPerSecond = Math.round(rand(60, 280));
  queueDepth = Math.round(rand(50, 1200));
  latencyStats.gatewayUs = Math.round(rand(28, 85));
  latencyStats.queueUs = Math.round(rand(90, 210));
  latencyStats.matchingUs = Math.round(rand(45, 160));
  latencyStats.totalUs = latencyStats.gatewayUs + latencyStats.queueUs + latencyStats.matchingUs;
}

setInterval(tickPrices, 1000);

// ── Public API ────────────────────────────────────────────────────────────────

export function getSymbols() { return Object.keys(SYMBOL_DATA); }
export function getSectors() {
  const s = new Set<string>();
  for (const row of Object.values(SYMBOL_DATA)) s.add(row[1] as string);
  return Array.from(s).sort();
}

export function getQuote(symbol: string): Quote | null {
  const row = SYMBOL_DATA[symbol];
  if (!row) return null;
  const price = prices[symbol];
  const open  = openPrices[symbol];
  const change = price - open;
  const changePercent = (change / open) * 100;
  return {
    symbol,
    name: row[0] as string,
    sector: row[1] as string,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePercent: +changePercent.toFixed(2),
    volume: sessionVolumes[symbol] + Math.round((row[7] as number) * 1_000_000 * rand(0.6, 0.9)),
    marketCap: (row[3] as number) * 1e9,
    peRatio: row[4] as number,
    week52High: row[5] as number,
    week52Low: row[6] as number,
    updatedAt: new Date().toISOString(),
  };
}

export function getAllQuotes(): Quote[] {
  return Object.keys(SYMBOL_DATA).map(s => getQuote(s)!).filter(Boolean);
}

export function getHistory(symbol: string, period: string): OhlcBar[] {
  return generateHistory(symbol, period);
}

export function getCurrentPrice(symbol: string): number {
  return prices[symbol] ?? 0;
}

export function setMarketState(state: MarketState) {
  marketState = state;
  isPaused = state === "paused";
  if (state === "flash_crash") {
    for (const sym of Object.keys(SYMBOL_DATA)) {
      prices[sym] *= rand(0.85, 0.95);
    }
    setTimeout(() => { if (marketState === "flash_crash") marketState = "running"; }, 10000);
  }
}

export function getMarketState() { return marketState; }
export function getMarketStartTime() { return marketStartTime; }

export function getStats() {
  const uptime = Math.round((Date.now() - marketStartTime) / 1000);
  return {
    ordersPerSecond, tradesPerSecond, queueDepth,
    ordersReceived: ordersReceivedTotal,
    ordersFilled:   ordersFilledTotal,
    ordersRejected: ordersRejectedTotal,
    partialFills:   partialFillsTotal,
    latency: { ...latencyStats },
    marketState,
    uptime,
  };
}

export function recordOrder(status: string) {
  ordersReceivedTotal++;
  if (status === "filled")   ordersFilledTotal++;
  else if (status === "rejected") ordersRejectedTotal++;
  else if (status === "partial")  partialFillsTotal++;
}

export function resetStats() {
  ordersReceivedTotal = 0; ordersFilledTotal = 0;
  ordersRejectedTotal = 0; partialFillsTotal = 0;
  marketStartTime = Date.now();
}
