#include <iostream>
#include <string>
#include <map>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cmath>
#include <functional>

using namespace std;
using namespace chrono;

// ── JSON helpers ──────────────────────────────────────────────────────────────

static string escStr(const string& s) {
    string r; r.reserve(s.size());
    for (char c : s) {
        if (c == '"') r += "\\\"";
        else if (c == '\\') r += "\\\\";
        else r += c;
    }
    return r;
}
static string jStr(const string& k, const string& v)  { return "\""+k+"\":\""+escStr(v)+"\""; }
static string jNum(const string& k, double v)  {
    ostringstream ss; ss << fixed << setprecision(4) << v;
    return "\""+k+"\":"+ss.str();
}
static string jInt(const string& k, long long v) { return "\""+k+"\":"+to_string(v); }
static string jBool(const string& k, bool v)     { return "\""+k+"\":"+(v?"true":"false"); }

static string extractStr(const string& j, const string& key) {
    string s = "\""+key+"\":\"";
    size_t p = j.find(s);
    if (p == string::npos) return "";
    p += s.size();
    size_t e = j.find('"', p);
    return (e == string::npos) ? "" : j.substr(p, e-p);
}
static double extractNum(const string& j, const string& key) {
    string s = "\""+key+"\":";
    size_t p = j.find(s);
    if (p == string::npos) return 0.0;
    p += s.size();
    while (p < j.size() && j[p]==' ') p++;
    if (p < j.size() && j[p]=='"') p++;
    size_t e = p;
    while (e < j.size() && (isdigit(j[e])||j[e]=='.'||j[e]=='-'||j[e]=='e'||j[e]=='E'||j[e]=='+')) e++;
    if (e == p) return 0.0;
    try { return stod(j.substr(p, e-p)); } catch(...) { return 0.0; }
}

static long long nowUs() {
    return duration_cast<microseconds>(steady_clock::now().time_since_epoch()).count();
}
static long long wallUs() {
    return duration_cast<microseconds>(system_clock::now().time_since_epoch()).count();
}

// ── Data structures ───────────────────────────────────────────────────────────

struct Order {
    string id;
    string symbol;
    string type;    // "market" | "limit"
    string side;    // "buy" | "sell"
    double qty      = 0;
    double price    = 0;
    double filledQty = 0;
    double totalFillValue = 0;
    string status;  // "queued" | "partial" | "filled" | "cancelled"
    long long seq   = 0;
    long long ts    = 0;
};

struct TradeRecord {
    string id;
    string symbol;
    string buyId;
    string sellId;
    double price;
    double qty;
    long long ts;
    long long latUs;
};

struct FillResult {
    vector<TradeRecord> trades;
    double filledQty   = 0;
    double avgPrice    = 0;
    string finalStatus;
    long long latUs    = 0;
};

struct Stats {
    long long ordersReceived = 0;
    long long ordersFilled   = 0;
    long long ordersRejected = 0;
    long long partialFills   = 0;
    long long tradesExecuted = 0;
    long long sumLatUs       = 0;
};

// ── Order book per symbol ─────────────────────────────────────────────────────

// Bid: highest price first, then oldest (lowest seq) first
struct BidCmp {
    bool operator()(const pair<double,long long>& a, const pair<double,long long>& b) const {
        if (a.first != b.first) return a.first > b.first;
        return a.second < b.second;
    }
};
// Ask: lowest price first, then oldest first
struct AskCmp {
    bool operator()(const pair<double,long long>& a, const pair<double,long long>& b) const {
        if (a.first != b.first) return a.first < b.first;
        return a.second < b.second;
    }
};

struct Book {
    map<pair<double,long long>, Order, BidCmp> bids;
    map<pair<double,long long>, Order, AskCmp> asks;
    // id -> (side, price, seq)
    unordered_map<string, tuple<string,double,long long>> idx;
    double lastPrice = 0;
};

// ── Global state ──────────────────────────────────────────────────────────────

static long long gSeq = 0;
static unordered_map<string, Book> gBooks;
static Stats gStats;
static vector<TradeRecord> gTrades;  // last 1000 trades

// ── Matching logic ────────────────────────────────────────────────────────────

static string genId() {
    static long long c = 0;
    ostringstream ss;
    ss << "T" << wallUs() << "_" << (++c);
    return ss.str();
}

static string fmtTrades(const vector<TradeRecord>& trades) {
    string s = "[";
    for (size_t i = 0; i < trades.size(); i++) {
        if (i) s += ",";
        const auto& t = trades[i];
        s += "{";
        s += jStr("id", t.id)+",";
        s += jStr("symbol", t.symbol)+",";
        s += jStr("buyOrderId", t.buyId)+",";
        s += jStr("sellOrderId", t.sellId)+",";
        s += jNum("price", t.price)+",";
        s += jNum("qty", t.qty)+",";
        s += jInt("ts", t.ts)+",";
        s += jInt("latUs", t.latUs);
        s += "}";
    }
    s += "]";
    return s;
}

static FillResult matchOrder(Order& incoming, Book& book, long long startUs) {
    FillResult res;
    res.finalStatus = "queued";

    bool isBuy = (incoming.side == "buy");
    bool isMarket = (incoming.type == "market");

    double remaining = incoming.qty;

    if (isBuy) {
        // Match against asks (lowest price first)
        auto it = book.asks.begin();
        while (it != book.asks.end() && remaining > 1e-9) {
            Order& resting = it->second;
            double restPrice = resting.price;

            // Price check (skip for market orders)
            if (!isMarket && incoming.price < restPrice - 1e-9) break;

            double fillQty = min(remaining, resting.qty - resting.filledQty);
            double fillPrice = restPrice; // price-time priority: resting order price

            TradeRecord tr;
            tr.id     = genId();
            tr.symbol = incoming.symbol;
            tr.buyId  = incoming.id;
            tr.sellId = resting.id;
            tr.price  = fillPrice;
            tr.qty    = fillQty;
            tr.ts     = wallUs();
            tr.latUs  = nowUs() - startUs;

            res.trades.push_back(tr);
            gTrades.push_back(tr);
            if (gTrades.size() > 1000) gTrades.erase(gTrades.begin());

            incoming.filledQty      += fillQty;
            incoming.totalFillValue += fillQty * fillPrice;
            resting.filledQty       += fillQty;
            resting.totalFillValue  += fillQty * fillPrice;
            remaining               -= fillQty;

            book.lastPrice = fillPrice;
            gStats.tradesExecuted++;

            if (resting.filledQty >= resting.qty - 1e-9) {
                resting.status = "filled";
                book.idx.erase(resting.id);
                it = book.asks.erase(it);
                gStats.ordersFilled++;
            } else {
                resting.status = "partial";
                ++it;
            }
        }
    } else {
        // Sell: match against bids (highest price first)
        auto it = book.bids.begin();
        while (it != book.bids.end() && remaining > 1e-9) {
            Order& resting = it->second;
            double restPrice = resting.price;

            if (!isMarket && incoming.price > restPrice + 1e-9) break;

            double fillQty = min(remaining, resting.qty - resting.filledQty);
            double fillPrice = restPrice;

            TradeRecord tr;
            tr.id     = genId();
            tr.symbol = incoming.symbol;
            tr.buyId  = resting.id;
            tr.sellId = incoming.id;
            tr.price  = fillPrice;
            tr.qty    = fillQty;
            tr.ts     = wallUs();
            tr.latUs  = nowUs() - startUs;

            res.trades.push_back(tr);
            gTrades.push_back(tr);
            if (gTrades.size() > 1000) gTrades.erase(gTrades.begin());

            incoming.filledQty      += fillQty;
            incoming.totalFillValue += fillQty * fillPrice;
            resting.filledQty       += fillQty;
            resting.totalFillValue  += fillQty * fillPrice;
            remaining               -= fillQty;

            book.lastPrice = fillPrice;
            gStats.tradesExecuted++;

            if (resting.filledQty >= resting.qty - 1e-9) {
                resting.status = "filled";
                book.idx.erase(resting.id);
                it = book.bids.erase(it);
                gStats.ordersFilled++;
            } else {
                resting.status = "partial";
                ++it;
            }
        }
    }

    // Determine final status
    if (incoming.filledQty >= incoming.qty - 1e-9) {
        incoming.status   = "filled";
        res.finalStatus   = "filled";
        gStats.ordersFilled++;
    } else if (incoming.filledQty > 1e-9) {
        incoming.status   = "partial";
        res.finalStatus   = "partial";
        gStats.partialFills++;
        // Add remaining to order book (limit orders only; market orders expire)
        if (!isMarket) {
            book.idx[incoming.id] = {incoming.side, incoming.price, incoming.seq};
            if (isBuy)
                book.bids[{incoming.price, incoming.seq}] = incoming;
            else
                book.asks[{incoming.price, incoming.seq}] = incoming;
        }
    } else {
        incoming.status   = "queued";
        res.finalStatus   = "queued";
        if (!isMarket) {
            book.idx[incoming.id] = {incoming.side, incoming.price, incoming.seq};
            if (isBuy)
                book.bids[{incoming.price, incoming.seq}] = incoming;
            else
                book.asks[{incoming.price, incoming.seq}] = incoming;
        }
    }

    res.filledQty = incoming.filledQty;
    res.avgPrice  = (incoming.filledQty > 1e-9) ? incoming.totalFillValue / incoming.filledQty : 0;
    res.latUs     = nowUs() - startUs;
    return res;
}

// ── Command handlers ──────────────────────────────────────────────────────────

static string handleAdd(const string& line) {
    long long start = nowUs();
    gStats.ordersReceived++;

    Order o;
    o.id     = extractStr(line, "id");
    o.symbol = extractStr(line, "symbol");
    o.type   = extractStr(line, "type");
    o.side   = extractStr(line, "side");
    o.qty    = extractNum(line, "qty");
    o.price  = extractNum(line, "price");
    o.seq    = ++gSeq;
    o.ts     = wallUs();
    o.status = "queued";

    if (o.id.empty() || o.symbol.empty() || o.qty <= 0 ||
        (o.type != "market" && o.type != "limit") ||
        (o.side != "buy" && o.side != "sell")) {
        gStats.ordersRejected++;
        return "{\"type\":\"result\",\"status\":\"rejected\",\"orderId\":\"\",\"reason\":\"Invalid order\",\"trades\":[],\"filledQty\":0,\"avgPrice\":0,\"latUs\":0}";
    }
    if (o.type == "limit" && o.price <= 0) {
        gStats.ordersRejected++;
        return "{\"type\":\"result\",\"status\":\"rejected\",\"orderId\":\"\",\"reason\":\"Limit order requires price\",\"trades\":[],\"filledQty\":0,\"avgPrice\":0,\"latUs\":0}";
    }

    auto& book = gBooks[o.symbol];
    FillResult res = matchOrder(o, book, start);
    gStats.sumLatUs += res.latUs;

    string out = "{";
    out += jStr("type","result")+",";
    out += jStr("status", res.finalStatus)+",";
    out += jStr("orderId", o.id)+",";
    out += jNum("filledQty", res.filledQty)+",";
    out += jNum("avgPrice", res.avgPrice)+",";
    out += jInt("latUs", res.latUs)+",";
    out += "\"trades\":"+fmtTrades(res.trades);
    out += "}";
    return out;
}

static string handleCancel(const string& line) {
    string id     = extractStr(line, "id");
    string symbol = extractStr(line, "symbol");
    if (id.empty() || symbol.empty()) return "{\"type\":\"cancelled\",\"ok\":false}";

    auto bit = gBooks.find(symbol);
    if (bit == gBooks.end()) return "{\"type\":\"cancelled\",\"ok\":false}";
    auto& book = bit->second;

    auto iit = book.idx.find(id);
    if (iit == book.idx.end()) return "{\"type\":\"cancelled\",\"ok\":false}";

    auto [side, price, seq] = iit->second;
    if (side == "buy")  book.bids.erase({price, seq});
    else                book.asks.erase({price, seq});
    book.idx.erase(iit);

    return "{\"type\":\"cancelled\",\"ok\":true,"+jStr("orderId",id)+"}";
}

static string handleOrderBook(const string& line) {
    string symbol = extractStr(line, "symbol");
    auto& book = gBooks[symbol];

    // Aggregate levels
    auto aggBids = [&]() -> string {
        map<double, pair<double,int>, greater<double>> lvls;
        for (auto& [k, o] : book.bids) {
            auto& lv = lvls[o.price];
            lv.first += (o.qty - o.filledQty);
            lv.second++;
        }
        string s = "["; bool first = true;
        int cnt = 0;
        for (auto& [p, qc] : lvls) {
            if (cnt++ >= 20) break;
            if (!first) s += ",";
            first = false;
            s += "{"+jNum("price",p)+","+jNum("quantity",qc.first)+","+jInt("orderCount",qc.second)+"}";
        }
        return s + "]";
    };
    auto aggAsks = [&]() -> string {
        map<double, pair<double,int>> lvls;
        for (auto& [k, o] : book.asks) {
            auto& lv = lvls[o.price];
            lv.first += (o.qty - o.filledQty);
            lv.second++;
        }
        string s = "["; bool first = true;
        int cnt = 0;
        for (auto& [p, qc] : lvls) {
            if (cnt++ >= 20) break;
            if (!first) s += ",";
            first = false;
            s += "{"+jNum("price",p)+","+jNum("quantity",qc.first)+","+jInt("orderCount",qc.second)+"}";
        }
        return s + "]";
    };

    double bestBid = book.bids.empty() ? 0 : book.bids.begin()->second.price;
    double bestAsk = book.asks.empty() ? 0 : book.asks.begin()->second.price;
    double spread  = (bestBid > 0 && bestAsk > 0) ? (bestAsk - bestBid) : 0;

    string out = "{";
    out += jStr("type","orderbook")+",";
    out += jStr("symbol",symbol)+",";
    out += "\"bids\":"+aggBids()+",";
    out += "\"asks\":"+aggAsks()+",";
    out += jNum("lastPrice", book.lastPrice)+",";
    out += jNum("spread", spread)+",";
    out += jInt("ts", wallUs());
    out += "}";
    return out;
}

static string handleStats() {
    long long avgLat = (gStats.ordersReceived > 0) ? gStats.sumLatUs / gStats.ordersReceived : 0;
    string out = "{";
    out += jStr("type","stats")+",";
    out += jInt("ordersReceived", gStats.ordersReceived)+",";
    out += jInt("ordersFilled",   gStats.ordersFilled)+",";
    out += jInt("ordersRejected", gStats.ordersRejected)+",";
    out += jInt("partialFills",   gStats.partialFills)+",";
    out += jInt("tradesExecuted", gStats.tradesExecuted)+",";
    out += jInt("avgLatUs",       avgLat);
    out += "}";
    return out;
}

static string handleReset() {
    gBooks.clear();
    gTrades.clear();
    gStats = Stats{};
    gSeq = 0;
    return "{\"type\":\"ok\",\"msg\":\"reset\"}";
}

// ── Main loop ─────────────────────────────────────────────────────────────────

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
        string cmd = extractStr(line, "cmd");
        string out;
        if      (cmd == "add")       out = handleAdd(line);
        else if (cmd == "cancel")    out = handleCancel(line);
        else if (cmd == "orderbook") out = handleOrderBook(line);
        else if (cmd == "stats")     out = handleStats();
        else if (cmd == "reset")     out = handleReset();
        else out = "{\"type\":\"error\",\"msg\":\"unknown command\"}";

        cout << out << "\n";
        cout.flush();
    }
    return 0;
}
