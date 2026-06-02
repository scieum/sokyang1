import type { BusRoute, BusStop, VehiclePosition } from "@sbus/shared";
import { CacheKeys, createCache } from "./cache.js";
import { config } from "./config.js";
import {
  MOCK_ROUTES,
  allMockStops,
  tickMockVehicles,
} from "./mock.js";
import { fetchRoutes, fetchStops, fetchVehicles } from "./tago.js";

/**
 * 풀링 데몬: 외부 API(또는 모의 데이터)를 일정 주기로 선제 수집해
 * 캐시에 적재하고, 차량 위치 갱신 시 구독자에게 푸시한다.
 */
export class Poller {
  private cache = createCache();
  private timer?: NodeJS.Timeout;
  private onVehicles?: (v: VehiclePosition[]) => void;

  /** 차량 위치 갱신 콜백 등록 (WebSocket 허브가 구독) */
  onVehicleUpdate(cb: (v: VehiclePosition[]) => void) {
    this.onVehicles = cb;
  }

  /** 노선/정류소 마스터 1회 적재 후 주기 폴링 시작 */
  async start() {
    await this.loadMasters();
    this.timer = setInterval(() => {
      this.pollVehicles().catch((e) =>
        console.warn("[poller] 차량 폴링 실패:", e.message)
      );
    }, config.pollIntervalMs);
    console.log(
      `[poller] 시작 (주기 ${config.pollIntervalMs}ms, mock=${config.useMock})`
    );
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private async loadMasters() {
    let routes: BusRoute[] = [];
    let stops: BusStop[] = [];

    if (config.useMock) {
      routes = MOCK_ROUTES;
      stops = allMockStops();
    } else {
      try {
        routes = await fetchRoutes();
        // 주요 노선의 정류소만 적재 (초안: 전체 노선의 정류소 수집은 비용 큼)
        for (const r of routes.slice(0, 10)) {
          stops.push(...(await fetchStops(r.routeId)));
        }
      } catch (e) {
        console.warn("[poller] TAGO 마스터 수집 실패 → 모의 데이터 폴백");
        routes = MOCK_ROUTES;
        stops = allMockStops();
      }
    }

    await this.cache.set(CacheKeys.routes, routes);
    await this.cache.set(CacheKeys.stops, stops);
    console.log(`[poller] 마스터 적재: 노선 ${routes.length}, 정류소 ${stops.length}`);
  }

  private async pollVehicles() {
    let vehicles: VehiclePosition[] = [];

    if (config.useMock) {
      vehicles = tickMockVehicles();
    } else {
      try {
        const routes =
          (await this.cache.get<BusRoute[]>(CacheKeys.routes)) ?? [];
        for (const r of routes.slice(0, 10)) {
          vehicles.push(...(await fetchVehicles(r.routeId)));
        }
      } catch {
        vehicles = tickMockVehicles();
      }
    }

    await this.cache.set(CacheKeys.vehicles, vehicles);
    this.onVehicles?.(vehicles);
  }

  // 외부에서 캐시 조회용
  getRoutes() {
    return this.cache.get<BusRoute[]>(CacheKeys.routes);
  }
  getStops() {
    return this.cache.get<BusStop[]>(CacheKeys.stops);
  }
  getVehicles() {
    return this.cache.get<VehiclePosition[]>(CacheKeys.vehicles);
  }
}
