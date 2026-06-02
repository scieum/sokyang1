import type {
  BusRoute,
  BusStop,
  LatLng,
  ServerMessage,
  VehiclePosition,
} from "@sbus/shared";
import { useEffect, useRef, useState } from "react";

/** 화면에 그릴 차량: 보간된 현재 좌표를 포함 */
export interface AnimatedVehicle extends VehiclePosition {
  display: LatLng; // rAF 로 부드럽게 이동하는 표시 좌표
}

interface StreamState {
  connected: boolean;
  routes: BusRoute[];
  stops: BusStop[];
  vehicles: AnimatedVehicle[];
}

/** 개발: Vite 프록시(/ws). 배포 시 동일 출처 가정. */
function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * 백엔드 WebSocket 을 구독하고, 차량 좌표를 60fps 로 보간한다.
 * 서버 데이터가 수 초 주기로 들어와도 마커가 미끄러지듯 이동한다.
 */
export function useBusStream(): StreamState {
  const [state, setState] = useState<StreamState>({
    connected: false,
    routes: [],
    stops: [],
    vehicles: [],
  });

  // 보간 대상(target)과 현재 표시 좌표(display)를 ref 로 관리
  const targets = useRef<Map<string, VehiclePosition>>(new Map());
  const display = useRef<Map<string, LatLng>>(new Map());
  const meta = useRef<Map<string, VehiclePosition>>(new Map());

  useEffect(() => {
    let ws: WebSocket;
    let raf = 0;
    let closed = false;

    function connect() {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => setState((s) => ({ ...s, connected: true }));
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!closed) setTimeout(connect, 1500); // 자동 재연결
      };
      ws.onmessage = (ev) => {
        const msg: ServerMessage = JSON.parse(ev.data);
        if (msg.type === "snapshot") {
          setState((s) => ({ ...s, routes: msg.routes, stops: msg.stops }));
        } else if (msg.type === "vehicles") {
          for (const v of msg.vehicles) {
            targets.current.set(v.vehicleId, v);
            meta.current.set(v.vehicleId, v);
            if (!display.current.has(v.vehicleId)) {
              display.current.set(v.vehicleId, { ...v.position });
            }
          }
        }
      };
    }

    // 60fps 보간 루프
    function tick() {
      let changed = false;
      for (const [id, target] of targets.current) {
        const cur = display.current.get(id);
        if (!cur) continue;
        const next = {
          lat: lerp(cur.lat, target.position.lat, 0.12),
          lng: lerp(cur.lng, target.position.lng, 0.12),
        };
        display.current.set(id, next);
        changed = true;
      }
      if (changed) {
        const vehicles: AnimatedVehicle[] = [];
        for (const [id, m] of meta.current) {
          const d = display.current.get(id)!;
          vehicles.push({ ...m, display: d });
        }
        setState((s) => ({ ...s, vehicles }));
      }
      raf = requestAnimationFrame(tick);
    }

    connect();
    raf = requestAnimationFrame(tick);

    return () => {
      closed = true;
      cancelAnimationFrame(raf);
      ws?.close();
    };
  }, []);

  return state;
}
