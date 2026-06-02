import type { ArrivalInfo, BusStop } from "@sbus/shared";
import { ROUTE_COLORS, demoArrivals } from "@sbus/shared";
import { useState } from "react";
import { BusMap } from "./components/BusMap";
import { useBusStream } from "./hooks/useBusStream";

export default function App() {
  const { mode, routes, stops, vehicles } = useBusStream();
  const [arrivals, setArrivals] = useState<{ stop: BusStop; info: ArrivalInfo[] } | null>(
    null
  );

  async function handleSelectStop(stop: BusStop) {
    // 백엔드(live)면 실 API, 데모면 클라이언트 생성값 사용
    if (mode === "live") {
      try {
        const res = await fetch(`/api/arrivals/${stop.stopId}`);
        const info: ArrivalInfo[] = await res.json();
        setArrivals({ stop, info });
        return;
      } catch {
        /* 실패 시 데모로 폴백 */
      }
    }
    setArrivals({ stop, info: demoArrivals(stop.stopId) });
  }

  const statusLabel =
    mode === "live"
      ? "● 실시간 연결됨"
      : mode === "demo"
        ? "◆ 데모 모드"
        : "○ 연결 중…";

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">🚌 S-Bus Link · 속초</h1>
        <span className="app__status">
          {statusLabel} · 차량 {vehicles.length}대
        </span>
      </header>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <BusMap
          routes={routes}
          stops={stops}
          vehicles={vehicles}
          onSelectStop={handleSelectStop}
        />

        {/* 노선 범례 */}
        <div className="legend">
          <strong>주요 노선</strong>
          {Object.entries(ROUTE_COLORS).map(([no, color]) => (
            <div className="legend__row" key={no}>
              <span className="legend__dot" style={{ background: color }} />
              {no}번
            </div>
          ))}
        </div>

        {/* 도착 정보 패널 */}
        {arrivals && (
          <div
            className="legend"
            style={{ left: "auto", right: 16, minWidth: 200 }}
            onClick={() => setArrivals(null)}
          >
            <strong>{arrivals.stop.stopName}</strong>
            {arrivals.info.length === 0 && <div>도착 정보 없음</div>}
            {arrivals.info.map((a, i) => (
              <div className="legend__row" key={i}>
                <span
                  className="legend__dot"
                  style={{ background: ROUTE_COLORS[a.routeNo] ?? "#475569" }}
                />
                {a.routeNo}번 · 약 {Math.round(a.arrivalSec / 60)}분 후 · {a.remainingStops}
                개 전
              </div>
            ))}
            <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
              (탭하면 닫기)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
