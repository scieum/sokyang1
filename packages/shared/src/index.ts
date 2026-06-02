/**
 * 프론트엔드(apps/web)와 백엔드(apps/server)가 공유하는 타입 정의.
 * GTFS Realtime 호환을 염두에 두고 최소 모델을 정의한다.
 */

/** WGS84 좌표 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 버스 노선 마스터 (TAGO 버스노선정보) */
export interface BusRoute {
  routeId: string; // 표준 9자리 ID 권장: 권역(3)+수단(1)+일련번호(5)
  routeNo: string; // 사용자에게 보이는 노선번호 (예: "1", "7", "9")
  startStopName: string; // 기점
  endStopName: string; // 종점
  color?: string; // 지도 표시 색상
}

/** 정류소 (TAGO 버스정류소정보) */
export interface BusStop {
  stopId: string;
  stopName: string;
  position: LatLng;
  order?: number; // 노선 내 순번
}

/** 실시간 차량 위치 (TAGO 버스위치정보) */
export interface VehiclePosition {
  vehicleId: string;
  routeId: string;
  routeNo: string;
  position: LatLng;
  /** 직전 정류소 순번 (보간/방향 추정용) */
  nodeOrder?: number;
  /** 서버 수집 시각 (epoch ms) */
  timestamp: number;
}

/** 도착 예정 정보 (TAGO 버스도착정보) */
export interface ArrivalInfo {
  routeId: string;
  routeNo: string;
  stopId: string;
  /** 도착 예상 시간 (초) */
  arrivalSec: number;
  /** 남은 정류장 수 */
  remainingStops: number;
  vehicleId?: string;
}

/** WebSocket: 클라이언트 → 서버 구독 요청 */
export interface SubscribeMessage {
  type: "subscribe";
  routeIds?: string[]; // 비우면 전체
  stopId?: string; // 도착정보를 받을 정류소
}

/** WebSocket: 서버 → 클라이언트 푸시 */
export type ServerMessage =
  | { type: "snapshot"; routes: BusRoute[]; stops: BusStop[] }
  | { type: "vehicles"; vehicles: VehiclePosition[] }
  | { type: "arrivals"; stopId: string; arrivals: ArrivalInfo[] };

export type ClientMessage = SubscribeMessage;

/** 속초시 주요 노선 색상 팔레트 */
export const ROUTE_COLORS: Record<string, string> = {
  "1": "#2563eb",
  "7": "#16a34a",
  "9": "#dc2626",
};
