import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ ip: req.socket.remoteAddress }, "WebSocket client connected");

    ws.on("error", (err) => logger.error({ err }, "WebSocket error"));
    ws.on("close", () => logger.debug("WebSocket client disconnected"));
  });

  logger.info("WebSocket server initialized at /api/ws");
  return wss;
}

export function broadcast(type: string, data: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

export function broadcastOrderBook(data: unknown) { broadcast("orderbook", data); }
export function broadcastTrade(data: unknown)     { broadcast("trade", data); }
export function broadcastStats(data: unknown)     { broadcast("stats", data); }
export function broadcastOrderUpdate(data: unknown) { broadcast("order_update", data); }
