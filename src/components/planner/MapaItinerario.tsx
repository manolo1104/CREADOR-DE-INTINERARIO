"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DestinoEnMapa } from "@/lib/extraerDestinos";

interface Props {
  destinosDelDia: DestinoEnMapa[];
}

interface Ruta {
  dia: number;
  color: string;
  puntos: LatLngExpression[];
}

const COLORES_POR_DIA = ["#0891b2", "#f87171", "#4ade80", "#fbbf24", "#a78bfa", "#fb923c"];

export default function MapaItinerario({ destinosDelDia }: Props) {
  const [rutas, setRutas] = useState<Ruta[]>([]);

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

  // Fetch real road routes from OSRM for each day
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const destinosKey = destinosDelDia.map((d) => `${d.lat},${d.lng}`).join("|");

  useEffect(() => {
    if (destinosDelDia.length < 2) return;

    const diasUnicos = Array.from(new Set(destinosDelDia.map((d) => d.dia))).sort((a, b) => a - b);

    const fetchAll = async () => {
      const resultado: Ruta[] = [];

      for (const dia of diasUnicos) {
        const puntosDelDia = destinosDelDia
          .filter((d) => d.dia === dia)
          .sort((a, b) => a.orden - b.orden);

        if (puntosDelDia.length < 2) continue;

        const color = COLORES_POR_DIA[(dia - 1) % COLORES_POR_DIA.length];
        // OSRM expects: lng,lat;lng,lat  (GeoJSON order)
        const waypoints = puntosDelDia.map((p) => `${p.lng},${p.lat}`).join(";");

        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(6000) }
          );
          const data = await res.json();
          if (data.routes?.[0]?.geometry?.coordinates) {
            // GeoJSON is [lng, lat] — flip to Leaflet [lat, lng]
            const puntos: LatLngExpression[] = data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as LatLngExpression
            );
            resultado.push({ dia, color, puntos });
          }
        } catch {
          // Fallback: straight line between points
          resultado.push({
            dia,
            color,
            puntos: puntosDelDia.map((p) => [p.lat, p.lng] as LatLngExpression),
          });
        }
      }

      setRutas(resultado);
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinosKey]);

  const centro = useMemo((): LatLngExpression => {
    const lats = destinosDelDia.map((d) => d.lat);
    const lngs = destinosDelDia.map((d) => d.lng);
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
  }, [destinosDelDia]);

  function crearIconoNumerado(orden: number, dia: number) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const color = COLORES_POR_DIA[(dia - 1) % COLORES_POR_DIA.length];
    return L.divIcon({
      className: "",
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};border:2.5px solid white;
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:13px;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        font-family:sans-serif;
      ">${orden}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
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

      {/* Road routes per day */}
      {rutas.map((ruta) => (
        <Polyline
          key={`ruta-dia-${ruta.dia}`}
          positions={ruta.puntos}
          pathOptions={{ color: ruta.color, opacity: 0.85, weight: 4 }}
        />
      ))}

      {/* Markers with hero image popup */}
      {destinosDelDia.map((d) => (
        <Marker
          key={`${d.dia}-${d.slug}`}
          position={[d.lat, d.lng]}
          icon={crearIconoNumerado(d.orden, d.dia)}
        >
          <Popup minWidth={180}>
            <div style={{ fontFamily: "sans-serif", width: "180px" }}>
              {d.imagen_hero && (
                <img
                  src={d.imagen_hero}
                  alt={d.nombre}
                  style={{
                    width: "180px",
                    height: "100px",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: "8px",
                  }}
                />
              )}
              <div style={{ padding: "0 2px 4px" }}>
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "2px" }}>
                  {d.nombre}
                </strong>
                <span
                  style={{
                    fontSize: "11px",
                    color: COLORES_POR_DIA[(d.dia - 1) % COLORES_POR_DIA.length],
                    fontWeight: 600,
                  }}
                >
                  Día {d.dia}
                </span>
                <span style={{ fontSize: "11px", color: "#888" }}> · Parada {d.orden}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
