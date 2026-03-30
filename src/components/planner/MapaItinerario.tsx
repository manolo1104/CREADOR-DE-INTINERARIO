"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface DestinoEnMapa {
  nombre: string;
  lat: number;
  lng: number;
  dia: number;
  orden: number;
}

interface Props {
  destinosDelDia: DestinoEnMapa[];
}

const COLORES_POR_DIA = ["#0891b2", "#f87171", "#4ade80", "#fbbf24", "#a78bfa", "#fb923c"];

export default function MapaItinerario({ destinosDelDia }: Props) {
  // Fix Leaflet default icon broken in SSR/Webpack
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const centro = useMemo((): LatLngExpression => {
    const lats = destinosDelDia.map((d) => d.lat);
    const lngs = destinosDelDia.map((d) => d.lng);
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
  }, [destinosDelDia]);

  // Group by day for polylines
  const diasUnicos = [...new Set(destinosDelDia.map((d) => d.dia))].sort((a, b) => a - b);

  function crearIconoNumerado(orden: number, dia: number) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const color = COLORES_POR_DIA[(dia - 1) % COLORES_POR_DIA.length];
    return L.divIcon({
      className: "",
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:${color};border:2px solid white;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:13px;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        font-family:sans-serif;
      ">${orden}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  }

  return (
    <MapContainer
      center={centro}
      zoom={10}
      scrollWheelZoom={false}
      className="h-72 md:h-96 rounded-xl overflow-hidden w-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {destinosDelDia.map((d) => (
        <Marker
          key={`${d.dia}-${d.nombre}`}
          position={[d.lat, d.lng]}
          icon={crearIconoNumerado(d.orden, d.dia)}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", fontSize: "13px", minWidth: "120px" }}>
              <strong>{d.nombre}</strong>
              <br />
              <span style={{ color: "#666" }}>Día {d.dia} · Parada {d.orden}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {diasUnicos.map((dia) => {
        const puntosDelDia = destinosDelDia
          .filter((d) => d.dia === dia)
          .sort((a, b) => a.orden - b.orden)
          .map((d): LatLngExpression => [d.lat, d.lng]);

        if (puntosDelDia.length < 2) return null;

        const color = COLORES_POR_DIA[(dia - 1) % COLORES_POR_DIA.length];
        return (
          <Polyline
            key={`ruta-dia-${dia}`}
            positions={puntosDelDia}
            pathOptions={{ color, opacity: 0.7, weight: 3 }}
          />
        );
      })}
    </MapContainer>
  );
}
