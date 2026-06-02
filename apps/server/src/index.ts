import cors from "@fastify/cors";
import type { BusRoute, BusStop, ServerMessage } from "@sbus/shared";
import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "./config.js";
import { mockArrivals } from "./mock.js";
import { Poller } from "./poller.js";

/**
 * S-Bus Link 백엔드 진입점.
 *  - Fastify: REST(스냅샷/헬스) 제공
 *  - ws: 실시간 차량 위치/도착정보 WebSocket 푸시
 *  - Poller: 외부 데이터 주기 수집 → 캐시 → 푸시
 */
async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const poller = new Poller();
  await poller.start();

  // --- REST 엔드포인트 ---
  app.get("/health", async () => ({ ok: true, mock: config.useMock }));

  app.get("/api/snapshot", async () => ({
    routes: (await poller.getRoutes()) ?? [],
    stops: (await poller.getStops()) ?? [],
    vehicles: (await poller.getVehicles()) ?? [],
  }));

  app.get<{ Params: { stopId: string } }>(
    "/api/arrivals/:stopId",
    async (req) => mockArrivals(req.params.stopId)
  );

  // --- WebSocket 허브 ---
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  wss.on("connection", async (ws) => {
    clients.add(ws);
    // 접속 즉시 스냅샷 전송
    const routes = (await poller.getRoutes()) ?? ([] as BusRoute[]);
    const stops = (await poller.getStops()) ?? ([] as BusStop[]);
    send(ws, { type: "snapshot", routes, stops });
    const vehicles = (await poller.getVehicles()) ?? [];
    send(ws, { type: "vehicles", vehicles });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.stopId) {
          send(ws, {
            type: "arrivals",
            stopId: msg.stopId,
            arrivals: mockArrivals(msg.stopId),
          });
        }
      } catch {
        /* 잘못된 메시지 무시 */
      }
    });

    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // 폴러가 차량을 갱신할 때마다 전체 구독자에게 푸시
  poller.onVehicleUpdate((vehicles) => {
    const msg: ServerMessage = { type: "vehicles", vehicles };
    for (const ws of clients) send(ws, msg);
  });

  // Fastify HTTP 서버에 WebSocket 업그레이드 연결
  app.server.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[server] http://localhost:${config.port}  (ws: /ws)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
