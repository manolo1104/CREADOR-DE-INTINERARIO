"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ItemDestino } from "./DestinosClient";

/**
 * Mapa de los destinos filtrados (20 nov 2026). Solo se carga si el visitante
 * elige «Mapa» (import dinámico sin SSR): Leaflet no pesa en la carga inicial
 * del índice. Círculos de color por nivel en vez de los íconos de Leaflet, que
 * se rompen con webpack y se cargarían de otro dominio.
 */
const COLOR: Record<number, string> = { 1: "#34d399", 2: "#f59e0b", 3: "#f97316", 4: "#ef4444" };

export default function MapaDestinos({ items, en }: { items: ItemDestino[]; en: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <MapContainer center={[21.95, -99.2]} zoom={8} scrollWheelZoom={false} style={{ height: 520, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map((d) => (
          <CircleMarker
            key={d.slug}
            center={[d.lat, d.lng]}
            radius={d.imprescindible ? 9 : 7}
            pathOptions={{ color: "#0e1710", weight: 2, fillColor: COLOR[d.nivel], fillOpacity: 0.95 }}
          >
            <Popup>
              <strong>{d.nombre}</strong>
              <br />
              {d.zona} · {d.nivelTexto}
              <br />
              {d.costo}
              {d.tiempoValles ? <><br />{d.tiempoValles} {en ? "from Ciudad Valles" : "desde Ciudad Valles"}</> : null}
              <br />
              <a href={d.href}>{en ? "See the guide →" : "Ver la ficha →"}</a>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="bg-negro/60 px-4 py-2 font-dm text-[11px] text-crema/50">
        {en ? "Color = effort level: green easy, amber moderate, orange challenging, red very challenging." : "Color = nivel físico: verde fácil, ámbar moderado, naranja exigente, rojo muy exigente."}
      </p>
    </div>
  );
}
