import type { BusRoute, BusStop, VehiclePosition } from "@sbus/shared";
import { config } from "./config.js";

/**
 * 국토교통부 TAGO API 클라이언트 (스텁).
 *
 * 실제 연동 시 아래 엔드포인트를 사용한다.
 *  - 버스노선정보:   /BusRouteInfoInqireService
 *  - 버스정류소정보: /BusSttnInfoInqireService
 *  - 버스도착정보:   /ArvlInfoInqireService
 *  - 버스위치정보:   /BusLcInfoInqireService
 *
 * 현재 환경(네트워크 제한/키 미발급)에서는 호출이 막힐 수 있으므로,
 * 키가 있을 때만 시도하고 실패 시 호출부에서 모의 데이터로 폴백한다.
 */

const BASE = "http://apis.data.go.kr/1613000";

function buildUrl(path: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("serviceKey", config.tagoServiceKey);
  url.searchParams.set("_type", "json");
  url.searchParams.set("cityCode", config.cityCode);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`TAGO HTTP ${res.status}`);
  return res.json();
}

/** TAGO 응답 items 를 안전하게 배열로 추출 */
function items(json: any): any[] {
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export async function fetchRoutes(): Promise<BusRoute[]> {
  const url = buildUrl("/BusRouteInfoInqireService/getRouteNoList", {
    numOfRows: 100,
    pageNo: 1,
  });
  return items(await fetchJson(url)).map((it) => ({
    routeId: String(it.routeid),
    routeNo: String(it.routeno),
    startStopName: String(it.startnodenm ?? ""),
    endStopName: String(it.endnodenm ?? ""),
  }));
}

export async function fetchStops(routeId: string): Promise<BusStop[]> {
  const url = buildUrl("/BusRouteInfoInqireService/getRouteAcctoThrghSttnList", {
    routeId,
    numOfRows: 200,
    pageNo: 1,
  });
  return items(await fetchJson(url)).map((it) => ({
    stopId: String(it.nodeid),
    stopName: String(it.nodenm),
    position: { lat: Number(it.gpslati), lng: Number(it.gpslong) },
    order: Number(it.nodeord ?? 0),
  }));
}

export async function fetchVehicles(routeId: string): Promise<VehiclePosition[]> {
  const url = buildUrl("/BusLcInfoInqireService/getRouteAcctoBusLcList", {
    routeId,
    numOfRows: 100,
    pageNo: 1,
  });
  const now = Date.now();
  return items(await fetchJson(url)).map((it) => ({
    vehicleId: String(it.vehicleno),
    routeId,
    routeNo: String(it.routenm ?? ""),
    position: { lat: Number(it.gpslati), lng: Number(it.gpslong) },
    nodeOrder: Number(it.nodeord ?? 0),
    timestamp: now,
  }));
}
