import { spawn, ChildProcess } from "child_process";
import { createInterface } from "readline";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "./logger";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const engineSrc = path.resolve(workspaceRoot, "artifacts/api-server/src/engine/matching_engine.cpp");
const engineBin = path.resolve(workspaceRoot, "artifacts/api-server/engine/matching_engine");

export interface EngineResult {
  type: string;
  status?: string;
  orderId?: string;
  filledQty?: number;
  avgPrice?: number;
  latUs?: number;
  reason?: string;
  trades?: Array<{
    id: string;
    symbol: string;
    buyOrderId: string;
    sellOrderId: string;
    price: number;
    qty: number;
    ts: number;
    latUs: number;
  }>;
  // orderbook
  symbol?: string;
  bids?: Array<{ price: number; quantity: number; orderCount: number }>;
  asks?: Array<{ price: number; quantity: number; orderCount: number }>;
  lastPrice?: number;
  spread?: number;
  // stats
  ordersReceived?: number;
  ordersFilled?: number;
  ordersRejected?: number;
  partialFills?: number;
  tradesExecuted?: number;
  avgLatUs?: number;
  ok?: boolean;
}

class MatchingEngine {
  private proc: ChildProcess | null = null;
  private pending: Map<string, { resolve: (v: EngineResult) => void; reject: (e: Error) => void }> = new Map();
  private reqCounter = 0;
  private ready = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    // Compile if needed
    const binDir = path.dirname(engineBin);
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

    const needsCompile = !fs.existsSync(engineBin) ||
      fs.statSync(engineSrc).mtimeMs > fs.statSync(engineBin).mtimeMs;

    if (needsCompile) {
      logger.info("Compiling C++ matching engine...");
      try {
        execSync(`g++ -std=c++20 -O2 -o "${engineBin}" "${engineSrc}"`, { stdio: "pipe" });
        logger.info("Matching engine compiled successfully");
      } catch (err: any) {
        logger.warn({ err: err.message, stderr: err.stderr?.toString() }, "Failed to compile matching engine, using JS fallback");
        return;
      }
    }

    this.spawn();
  }

  private restartCount = 0;
  private lastSpawnTime = 0;
  private permanentlyFailed = false;

  private spawn() {
    if (this.permanentlyFailed) return;
    if (!fs.existsSync(engineBin)) {
      logger.warn({ engineBin }, "Engine binary not found, running without C++ engine");
      return;
    }

    this.lastSpawnTime = Date.now();
    this.proc = spawn(engineBin, [], { stdio: ["pipe", "pipe", "pipe"] });
    this.ready = true;

    // Absorb EPIPE — fired when we write to stdin after the child has already exited
    this.proc.stdin!.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code !== "EPIPE") logger.warn({ err: err.message }, "Engine stdin error");
    });

    // Handle spawn failures (ENOENT, ENOEXEC — e.g. wrong-platform binary)
    this.proc.on("error", (err: NodeJS.ErrnoException) => {
      logger.warn({ err: err.message }, "Engine process error");
      this.ready = false;
    });

    const rl = createInterface({ input: this.proc.stdout! });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const data: EngineResult = JSON.parse(line);
        const [firstKey] = this.pending.keys();
        if (firstKey) {
          const p = this.pending.get(firstKey)!;
          this.pending.delete(firstKey);
          p.resolve(data);
        }
      } catch (err) {
        logger.error({ line }, "Failed to parse engine output");
      }
    });

    this.proc.stderr?.on("data", (d) => {
      logger.debug({ msg: d.toString().trim() }, "Engine stderr");
    });

    this.proc.on("exit", (code) => {
      this.ready = false;
      for (const [, p] of this.pending) p.reject(new Error("Engine restart"));
      this.pending.clear();

      const aliveMs = Date.now() - this.lastSpawnTime;
      if (aliveMs < 500) {
        // Crashed too fast — wrong platform binary or fatal startup error
        this.restartCount++;
        if (this.restartCount >= 3) {
          logger.warn({ code, restartCount: this.restartCount }, "Engine crashes on startup, disabling C++ engine");
          this.permanentlyFailed = true;
          return;
        }
      } else {
        this.restartCount = 0; // healthy run, reset counter
      }

      logger.warn({ code }, "Matching engine exited, restarting in 1s");
      setTimeout(() => this.spawn(), 1000);
    });
  }

  private async send(cmd: object): Promise<EngineResult> {
    await this.initPromise;
    if (!this.ready || !this.proc?.stdin?.writable) {
      throw new Error("Matching engine not ready");
    }
    const key = String(++this.reqCounter);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error("Engine timeout"));
      }, 5000);
      this.pending.set(key, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject:  (e) => { clearTimeout(timeout); reject(e); },
      });
      try {
        this.proc!.stdin!.write(JSON.stringify(cmd) + "\n");
      } catch (err) {
        this.pending.delete(key);
        clearTimeout(timeout);
        reject(new Error("Engine write failed"));
      }
    });
  }

  async addOrder(params: {
    id: string;
    symbol: string;
    type: string;
    side: string;
    qty: number;
    price: number;
  }): Promise<EngineResult> {
    return this.send({ cmd: "add", ...params });
  }

  async cancelOrder(id: string, symbol: string): Promise<EngineResult> {
    return this.send({ cmd: "cancel", id, symbol });
  }

  async getOrderBook(symbol: string): Promise<EngineResult> {
    return this.send({ cmd: "orderbook", symbol });
  }

  async getStats(): Promise<EngineResult> {
    return this.send({ cmd: "stats" });
  }

  async reset(): Promise<EngineResult> {
    return this.send({ cmd: "reset" });
  }
}

export const engine = new MatchingEngine();
