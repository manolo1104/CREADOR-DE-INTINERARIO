"use client";

import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ParadaMapa } from "@/lib/fichaPaquete";

/**
 * El mapa de la ruta del paquete (20 nov 2026). Mismo patrón que el de
 * /destinos: círculos en vez de los íconos de Leaflet (se rompen con webpack y
 * vienen de otro dominio) y carga dinámica sin SSR.
 *
 * Las líneas unen las paradas EN ORDEN: no son el camino por carretera (no
 * tenemos esas rutas y no se inventan). Xilitla va aparte, en dorado: es donde
 * se duerme cada noche, no una parada del día.
 */
const COLORES_DIA = ["#3a8aaa", "#8fbe3a", "#c4882a", "#e6d4b0", "#5a9e2a", "#9a4a1e"];

export default function MapaRutaLeaflet({
  paradas, diaTexto, verTexto, onInteraccion,
}: {
  paradas: ParadaMapa[];
  diaTexto: (n: number) => string;
  verTexto: string;
  onInteraccion: (id: string) => void;
}) {
  const ruta = paradas.filter((p) => !p.base);
  const base = paradas.find((p) => p.base);
  const todos = paradas.map((p) => [p.lat, p.lng] as [number, number]);
  const lats = todos.map((x) => x[0]);
  const lngs = todos.map((x) => x[1]);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05],
    [Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05],
  ];

  return (
    <MapContainer bounds={bounds} scrollWheelZoom={false} style={{ height: 460, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={ruta.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#0e1710", weight: 3, opacity: 0.7, dashArray: "6 8" }} />
      {base && (
        <CircleMarker
          center={[base.lat, base.lng]}
          radius={11}
          pathOptions={{ color: "#0e1710", weight: 2, fillColor: "#c4882a", fillOpacity: 1 }}
          eventHandlers={{ click: () => onInteraccion(base.id) }}
        >
          <Popup><strong>{base.nombre}</strong><br />{base.descripcion}</Popup>
        </CircleMarker>
      )}
      {ruta.map((p, k) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={10}
          pathOptions={{ color: "#0e1710", weight: 2, fillColor: COLORES_DIA[(p.dia - 1) % COLORES_DIA.length], fillOpacity: 0.95 }}
          eventHandlers={{ click: () => onInteraccion(p.id) }}
        >
          <Tooltip permanent direction="center" className="mapa-num">{k + 1}</Tooltip>
          <Popup>
            <div style={{ width: 200 }}>
              {p.foto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.foto} alt={p.nombre} width={200} height={120} style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 8 }} loading="lazy" />
              )}
              <strong style={{ display: "block", marginTop: 6 }}>{p.nombre}</strong>
              <span>{diaTexto(p.dia)} · {p.actividad}</span>
              <br />
              <span style={{ opacity: 0.8 }}>{p.descripcion}</span>
              {p.href && (<><br /><a href={p.href}>{verTexto} →</a></>)}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
