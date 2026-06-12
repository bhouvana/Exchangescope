import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/websocket";
import { initAiTraders } from "./lib/aiTraders";
import { engine } from "./lib/matchingEngine";
import { getStats } from "./lib/marketData";
import { broadcastStats } from "./lib/websocket";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const server = createServer(app);
setupWebSocket(server);

server.listen(port, () => {
  logger.info({ port }, "ExchangeScope API server listening");

  // Start AI traders after server is up
  setTimeout(() => {
    try {
      initAiTraders();
      logger.info("AI traders initialized");
    } catch (err) {
      logger.error({ err }, "Failed to init AI traders");
    }
  }, 3000);

  // Broadcast stats every second
  setInterval(() => {
    const stats = getStats();
    broadcastStats(stats);
  }, 1000);
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
