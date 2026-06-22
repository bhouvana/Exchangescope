import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/websocket";
import { initAiTraders } from "./lib/aiTraders";
import { engine } from "./lib/matchingEngine";
import { buildMarketStats } from "./lib/marketStats";
import { startLiveMarketData } from "./lib/marketData";
import { broadcastStats } from "./lib/websocket";
import { seedAllCompanies } from "./lib/seedCompanies";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const server = createServer(app);
setupWebSocket(server);

server.listen(port, async () => {
  logger.info({ port }, "ExchangeScope API server listening");

  startLiveMarketData();

  // Always re-seed on startup so the DB stays in sync with the symbol maps in marketData.ts
  try {
    logger.info("Auto-seed on startup (clears + reinserts all exchanges)...");
    seedAllCompanies()
      .then(r => logger.info({ counts: r }, "Auto-seed complete"))
      .catch(err => logger.error({ err }, "Auto-seed failed"));
  } catch (err) {
    logger.warn({ err }, "Could not start auto-seed");
  }

  // Start AI traders after server is up
  setTimeout(() => {
    try {
      initAiTraders();
      logger.info("AI traders initialized");
    } catch (err) {
      logger.error({ err }, "Failed to init AI traders");
    }
  }, 3000);

  // Broadcast merged engine stats every second
  setInterval(() => {
    buildMarketStats()
      .then(broadcastStats)
      .catch(() => { /* engine not ready */ });
  }, 1000);
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
