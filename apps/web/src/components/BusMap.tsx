import { ROUTE_COLORS, type BusRoute, type BusStop } from "@sbus/shared";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { AnimatedVehicle } from "../hooks/useBusStream";

// 속초 시내 중심
const SOKCHO_CENTER: [number, number] = [38.207, 128.5918];

function colorOf(routeNo: string) {
  return ROUTE_COLORS[routeNo] ?? "#475569";
}

/** 노선번호가 적힌 원형 버스 마커 아이콘 */
function busIcon(routeNo: string) {
  return L.divIcon({
    className: "",
    html: `<div class="bus-marker" style="background:${colorOf(routeNo)}">${routeNo}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

interface Props {
  routes: BusRoute[];
  stops: BusStop[];
  vehicles: AnimatedVehicle[];
  onSelectStop?: (stop: BusStop) => void;
}

export function BusMap({ stops, vehicles, onSelectStop }: Props) {
  return (
    <MapContainer center={SOKCHO_CENTER} zoom={14} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 정류소 */}
      {stops.map((stop) => (
        <CircleMarker
          key={stop.stopId}
          center={[stop.position.lat, stop.position.lng]}
          radius={5}
          pathOptions={{ color: "#64748b", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
          eventHandlers={{ click: () => onSelectStop?.(stop) }}
        >
          <Popup>
            <div className="bus-popup">
              <strong>{stop.stopName}</strong>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* 실시간 차량 (60fps 보간된 좌표) */}
      {vehicles.map((v) => (
        <Marker
          key={v.vehicleId}
          position={[v.display.lat, v.display.lng]}
          icon={busIcon(v.routeNo)}
        >
          <Popup>
            <div className="bus-popup">
              <strong>{v.routeNo}번</strong> 버스
              <br />
              차량 {v.vehicleId}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
