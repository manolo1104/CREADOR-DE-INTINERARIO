"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Check, Printer, Mail } from "lucide-react";
import { playClick } from "@/lib/admin/sfx";

export interface FilaResena {
  id:       string;
  folio:    string;
  nombre:   string;
  tour:     string;
  fecha:    string;          // YYYY-MM-DD
  waUrl:    string | null;   // null si la reserva no trae un teléfono usable
  waAt:     string | null;   // cuándo se pidió por WhatsApp
  correoAt: string | null;   // cuándo salió el correo automático
}

const fFecha = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** «hace 3 días» a partir de la fecha del tour, para priorizar a quien viajó ayer. */
function haceDias(ymd: string): string {
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) + "T12:00:00");
  const d = Math.round((hoy.getTime() - new Date(`${ymd}T12:00:00`).getTime()) / 86_400_000);
  return d <= 1 ? "ayer" : `hace ${d} días`;
}

export default function ResenasClient({ filas: iniciales }: { filas: FilaResena[] }) {
  const [filas, setFilas] = useState(iniciales);

  // Pendientes primero (del viaje más reciente al más viejo); luego las ya pedidas.
  const ordenadas = useMemo(
    () => [...filas].sort((a, b) =>
      Number(!!a.waAt) - Number(!!b.waAt) || b.fecha.localeCompare(a.fecha)),
    [filas],
  );
  const pendientes = filas.filter((f) => !f.waAt && f.waUrl).length;

  function pedir(f: FilaResena) {
    if (!f.waUrl) return;
    playClick();
    // Se abre primero: si la marca fallara, el mensaje igual sale.
    window.open(f.waUrl, "_blank", "noopener,noreferrer");
    const ahora = new Date().toISOString();
    setFilas((fs) => fs.map((x) => (x.id === f.id ? { ...x, waAt: ahora } : x)));
    fetch(`/api/admin/reservas/${f.id}/resena-whatsapp`, { method: "POST" }).catch(() => {});
  }

  return (
    <div className="px-5 sm:px-7 py-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <p className="panel-eyebrow mb-1.5">Reseñas de Google</p>
        <h1 className="font-cormorant text-[#16362a] text-[30px] leading-none font-light">
          {pendientes > 0 ? `${pendientes} por pedir` : "Todos al día"}
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] font-dm text-[rgba(22,54,42,0.66)] leading-relaxed">
          Las reseñas son lo que más sube a la ficha en el mapa de Google. Por correo casi nadie
          reseña; por WhatsApp, al día siguiente del tour, sí. Un clic abre el WhatsApp con el
          mensaje y el enlace listos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* ── La lista ── */}
        <div className="panel-card overflow-hidden">
          {ordenadas.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] font-dm text-[rgba(22,54,42,0.5)]">
              Nadie ha viajado en las últimas semanas.
            </p>
          ) : (
            <ul>
              {ordenadas.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#1B4332]/8 px-5 py-3.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-dm text-[#16362a] truncate">{f.nombre}</p>
                    <p className="text-[12px] font-dm text-[rgba(22,54,42,0.55)] truncate">
                      {f.tour} · {fFecha(f.fecha)} ({haceDias(f.fecha)})
                    </p>
                  </div>
                  {f.correoAt && (
                    <span title="Ya le llegó el correo automático" className="flex items-center gap-1 text-[11px] font-dm text-[rgba(22,54,42,0.45)]">
                      <Mail className="w-3.5 h-3.5" /> correo
                    </span>
                  )}
                  {f.waAt ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-dm text-[#52B788]">
                      <Check className="w-4 h-4" /> Pedida por WhatsApp
                    </span>
                  ) : f.waUrl ? (
                    <button
                      onClick={() => pedir(f)}
                      className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-2 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco"
                    >
                      <MessageCircle className="w-4 h-4" /> Pedir reseña
                    </button>
                  ) : (
                    <span className="text-[11px] font-dm text-[rgba(22,54,42,0.45)]">Sin teléfono</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── La tarjeta QR para los guías ── */}
        <div className="panel-card p-5 text-center">
          <p className="panel-eyebrow mb-3">Tarjeta para los guías</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/resena/qr-google.svg" alt="Código QR para dejar una reseña en Google" width={180} height={180} className="mx-auto" />
          <p className="mt-3 text-[13px] font-dm text-[#16362a]">Al terminar el tour, que la escaneen ahí mismo.</p>
          <p className="mt-1 text-[11px] font-dm text-[rgba(22,54,42,0.55)]">Abre directo la ventana de reseña de la ficha en Google.</p>
          <a
            href="/resena/tarjeta.html"
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex items-center gap-2 panel-card px-3.5 py-2 text-[12px] font-dm text-[rgba(22,54,42,0.75)] hover:text-[#16362a] panel-pulsable panel-foco"
          >
            <Printer className="w-4 h-4" /> Imprimir tarjeta
          </a>
        </div>
      </div>
    </div>
  );
}
