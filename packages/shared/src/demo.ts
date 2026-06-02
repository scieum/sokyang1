/**
 * 백엔드 없이(예: GitHub Pages 정적 호스팅) 프론트엔드만으로
 * 데모를 보여주기 위한 클라이언트 안전 모의 피드.
 * Node 의존성이 없어 브라우저에서 그대로 사용 가능하다.
 */
import type { ArrivalInfo, BusRoute, BusStop, VehiclePosition } from "./index.js";
import { ROUTE_COLORS } from "./index.js";

const SOKCHO_CENTER = { lat: 38.207, lng: 128.5918 };

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

export const DEMO_ROUTES: BusRoute[] = [
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

const DEMO_STOPS_BY_ROUTE: Record<string, BusStop[]> = {
  "323010001": makeStops("1", SOKCHO_CENTER),
  "323010007": makeStops("7", { lat: 38.195, lng: 128.585 }),
  "323010009": makeStops("9", { lat: 38.215, lng: 128.598 }),
};

export const DEMO_STOPS: BusStop[] = Object.values(DEMO_STOPS_BY_ROUTE).flat();

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

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

/** 차량별 진행도를 들고 다니며 tick() 마다 위치를 갱신하는 데모 피드 */
export class DemoFeed {
  private progress: Record<string, number> = { "v-1": 0.1, "v-7": 0.5, "v-9": 0.8 };
  private map: Array<[string, BusRoute]> = [
    ["v-1", DEMO_ROUTES[0]],
    ["v-7", DEMO_ROUTES[1]],
    ["v-9", DEMO_ROUTES[2]],
  ];

  tick(): VehiclePosition[] {
    const now = Date.now();
    return this.map.map(([vid, route]) => {
      this.progress[vid] = (this.progress[vid] + 0.02) % 1;
      const stops = DEMO_STOPS_BY_ROUTE[route.routeId];
      const { pos, nodeOrder } = positionAlong(stops, this.progress[vid]);
      return {
        vehicleId: vid,
        routeId: route.routeId,
        routeNo: route.routeNo,
        position: pos,
        nodeOrder,
        timestamp: now,
      } satisfies VehiclePosition;
    });
  }
}

export function demoArrivals(stopId: string): ArrivalInfo[] {
  const route = DEMO_ROUTES.find((r) => stopId.includes(r.routeNo)) ?? DEMO_ROUTES[0];
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
