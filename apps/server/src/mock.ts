import type {
  ArrivalInfo,
  BusRoute,
  BusStop,
  VehiclePosition,
} from "@sbus/shared";
import { ROUTE_COLORS } from "@sbus/shared";

/**
 * 속초시 모의 데이터. TAGO 서비스 키가 없을 때 앱 전체가
 * 동작하도록 1·7·9번 노선을 가상으로 구성한다.
 * 좌표는 속초 시내 인근(WGS84) 예시 값.
 */

// 속초 중심부 인근 예시 정류소 좌표
const SOKCHO_CENTER = { lat: 38.2070, lng: 128.5918 };

function makeStops(routeNo: string, base: { lat: number; lng: number }): BusStop[] {
  const stops: BusStop[] = [];
  for (let i = 0; i < 8; i++) {
    stops.push({
      stopId: `323${routeNo}0${i}`,
      stopName: `${routeNo}번-정류소${i + 1}`,
      position: {
        lat: base.lat + i * 0.004,
        lng: base.lng + Math.sin(i / 2) * 0.006,
      },
      order: i,
    });
  }
  return stops;
}

export const MOCK_ROUTES: BusRoute[] = [
  {
    routeId: "323010001",
    routeNo: "1",
    startStopName: "속초고속버스터미널",
    endStopName: "설악산입구",
    color: ROUTE_COLORS["1"],
  },
  {
    routeId: "323010007",
    routeNo: "7",
    startStopName: "속초시외버스터미널",
    endStopName: "대포항",
    color: ROUTE_COLORS["7"],
  },
  {
    routeId: "323010009",
    routeNo: "9",
    startStopName: "속초해수욕장",
    endStopName: "청초호",
    color: ROUTE_COLORS["9"],
  },
];

export const MOCK_STOPS: Record<string, BusStop[]> = {
  "323010001": makeStops("1", SOKCHO_CENTER),
  "323010007": makeStops("7", { lat: 38.195, lng: 128.585 }),
  "323010009": makeStops("9", { lat: 38.215, lng: 128.598 }),
};

export function allMockStops(): BusStop[] {
  return Object.values(MOCK_STOPS).flat();
}

/** 차량별 진행도(0~1)를 시간에 따라 갱신해 위치를 보간 생성 */
const progress: Record<string, number> = {
  "v-1": 0.1,
  "v-7": 0.5,
  "v-9": 0.8,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** 노선 정류소 경로를 따라 진행도 위치를 계산 */
function positionAlong(stops: BusStop[], p: number) {
  const seg = (stops.length - 1) * p;
  const i = Math.min(Math.floor(seg), stops.length - 2);
  const t = seg - i;
  const a = stops[i].position;
  const b = stops[i + 1].position;
  return {
    pos: { lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) },
    nodeOrder: i,
  };
}

export function tickMockVehicles(): VehiclePosition[] {
  const now = Date.now();
  const vehicles: VehiclePosition[] = [];
  const map: Array<[string, BusRoute]> = [
    ["v-1", MOCK_ROUTES[0]],
    ["v-7", MOCK_ROUTES[1]],
    ["v-9", MOCK_ROUTES[2]],
  ];
  for (const [vid, route] of map) {
    progress[vid] = (progress[vid] + 0.02) % 1;
    const stops = MOCK_STOPS[route.routeId];
    const { pos, nodeOrder } = positionAlong(stops, progress[vid]);
    vehicles.push({
      vehicleId: vid,
      routeId: route.routeId,
      routeNo: route.routeNo,
      position: pos,
      nodeOrder,
      timestamp: now,
    });
  }
  return vehicles;
}

export function mockArrivals(stopId: string): ArrivalInfo[] {
  // 정류소 ID 의 노선/순번을 대략 활용해 가상 도착정보 생성
  const route = MOCK_ROUTES.find((r) => stopId.includes(r.routeNo)) ?? MOCK_ROUTES[0];
  return [
    {
      routeId: route.routeId,
      routeNo: route.routeNo,
      stopId,
      arrivalSec: 60 + Math.floor(Math.random() * 240),
      remainingStops: 1 + Math.floor(Math.random() * 5),
      vehicleId: `v-${route.routeNo}`,
    },
  ];
}
