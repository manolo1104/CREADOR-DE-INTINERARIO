"use client";

import { useMemo, useState } from "react";
import { Search, MessageCircle, Mail, X } from "lucide-react";
import type { LeadCurso, ResumenCurso } from "@/lib/admin/curso";

const V = "#1B4332";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });

/** "en 5 d 3 h" o "hace 2 h": lo que queda o lo que pasó, sin hacer cuentas. */
function faltan(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const txt = d > 0 ? `${d} d ${h} h` : `${h} h`;
  return ms > 0 ? `faltan ${txt}` : `hace ${txt}`;
}

function Tarjeta({
  n, etiqueta, nota, acento,
}: { n: string | number; etiqueta: string; nota?: string; acento?: boolean }) {
  return (
    <div className={`bg-white border rounded-sm p-4 ${acento ? "border-[#1B4332]/40" : "border-[#1B4332]/10"}`}>
      <p className={`font-cormorant text-3xl font-light leading-none ${acento ? "text-[#1B4332]" : "text-[#1B4332]/85"}`}>
        {n}
      </p>
      <p className="mt-2 font-dm text-[10px] uppercase tracking-[1.5px] text-[#1B4332]/50">
        {etiqueta}
      </p>
      {nota && <p className="mt-1.5 font-dm text-xs text-[#1B4332]/45">{nota}</p>}
    </div>
  );
}

export default function CursoClient({ r }: { r: ResumenCurso }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "taller" | "programa" | "pagados">("todos");
  const [sel, setSel] = useState<LeadCurso | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return r.leads.filter((l) => {
      if (filtro === "taller" && !l.webinar) return false;
      if (filtro === "programa" && l.webinar) return false;
      if (filtro === "pagados" && !l.compro) return false;
      if (!t) return true;
      return [l.nombre, l.email, l.whatsapp, l.ciudad, l.tipoNegocio]
        .some((v) => v?.toLowerCase().includes(t));
    });
  }, [r.leads, q, filtro, ]);

  const wa = (l: LeadCurso) =>
    `https://wa.me/${(l.whatsapp ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(
      `Hola${l.nombre ? " " + l.nombre.split(" ")[0] : ""}, soy Manolo. Te escribo por el taller de Turismo con IA.`
    )}`;

  const botonFiltro = (k: typeof filtro, txt: string, n: number) => (
    <button
      key={k}
      onClick={() => setFiltro(k)}
      className={`px-3 py-1.5 font-dm text-xs rounded-sm border transition-colors ${
        filtro === k
          ? "bg-[#1B4332] text-white border-[#1B4332]"
          : "bg-white text-[#1B4332]/70 border-[#1B4332]/15 hover:border-[#1B4332]/40"
      }`}
    >
      {txt} <span className="opacity-60">{n}</span>
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-cormorant text-2xl font-light" style={{ color: V }}>
          Curso Turismo con IA
        </h1>
        <p className="mt-1 font-dm text-sm text-[#1B4332]/50">
          Taller {new Date(r.noche1Iso).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · {faltan(r.noche1Iso)}
          {" · "}
          {r.ofertaAbierta ? "inscripciones abiertas" : "la oferta abre en la noche 3"}
        </p>
      </div>

      {/* Lo que hay que mirar de un vistazo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tarjeta n={r.registrados} etiqueta="Registrados al taller" nota={`${r.hoy} en 24 h`} acento />
        <Tarjeta n={r.soloPrograma} etiqueta="Pidieron el programa" nota="sin registrarse al taller" />
        <Tarjeta n={r.pagados} etiqueta="Pagados" nota={`quedan ${r.lugaresLibres} de 25`} acento={r.pagados > 0} />
        <Tarjeta n={r.checkoutSinPagar} etiqueta="Pago a medias" nota="lo más caliente que hay" acento={r.checkoutSinPagar > 0} />
        <Tarjeta n={`$${r.precio.toLocaleString("es-MX")}`} etiqueta={r.esFundador ? "Precio de fundador" : "Precio regular"} nota={r.esFundador ? faltan(r.finFundadorIso) : faltan(r.cierreIso)} />
        <Tarjeta n={r.bajas} etiqueta="Bajas" nota={r.bajas > 0 ? "revisa qué correo las causó" : "ninguna"} />
      </div>

      {r.porNegocio.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {r.porNegocio.map(({ tipo, n }) => (
            <span key={tipo} className="bg-white border border-[#1B4332]/10 rounded-sm px-3 py-1.5 font-dm text-xs text-[#1B4332]/70">
              {tipo} <strong className="text-[#1B4332]">{n}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {botonFiltro("todos", "Todos", r.leads.length)}
        {botonFiltro("taller", "Del taller", r.registrados)}
        {botonFiltro("programa", "Del programa", r.soloPrograma)}
        {botonFiltro("pagados", "Pagados", r.pagados)}
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo, WhatsApp, ciudad o negocio…"
          className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 rounded-sm focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30"
        />
      </div>

      <div className="mt-4 bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/50 text-[10px] tracking-[1.5px] uppercase">
                <th className="text-left py-3 px-4">Persona</th>
                <th className="text-left py-3 px-4">Negocio</th>
                <th className="text-center py-3 px-4">Vía</th>
                <th className="text-center py-3 px-4">Correos</th>
                <th className="text-left py-3 px-4">Se apuntó</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center font-dm text-[#1B4332]/30">
                    {r.leads.length === 0
                      ? "Todavía no se registra nadie. Aparecerán aquí en cuanto lo hagan."
                      : "Nadie coincide con esa búsqueda."}
                  </td>
                </tr>
              )}
              {lista.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSel(l)}
                  className={`border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/60 cursor-pointer transition-colors ${
                    l.status !== "activo" ? "opacity-45" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <p className="text-[#1B4332] font-medium">{l.nombre ?? "—"}</p>
                    <p className="text-[#1B4332]/50 text-xs">{l.email}</p>
                  </td>
                  <td className="py-3 px-4 text-[#1B4332]/70 text-xs">
                    {l.tipoNegocio ?? "—"}
                    {l.ciudad ? <span className="text-[#1B4332]/40"> · {l.ciudad}</span> : null}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-[1px] ${
                      l.compro ? "bg-[#1B4332] text-white"
                      : l.checkoutIniciado ? "bg-[#B8860B]/15 text-[#8a6508]"
                      : l.webinar ? "bg-[#1B4332]/10 text-[#1B4332]"
                      : "bg-[#1B4332]/5 text-[#1B4332]/60"
                    }`}>
                      {l.compro ? "pagó" : l.checkoutIniciado ? "a medias" : l.webinar ? "taller" : "programa"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-[#1B4332]/60 tabular-nums">{l.correos.length}</td>
                  <td className="py-3 px-4 text-[#1B4332]/60 text-xs whitespace-nowrap">{fecha(l.creadoIso)}</td>
                  <td className="py-3 px-4 text-right">
                    {l.whatsapp && (
                      <a
                        href={wa(l)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[#1B4332]/60 hover:text-[#1B4332]"
                        title="Escribirle por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setSel(null)}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-sm sm:rounded-sm border border-[#1B4332]/15 max-h-[85vh] overflow-auto">
            <div className="flex items-start justify-between p-5 border-b border-[#1B4332]/10">
              <div>
                <h2 className="font-cormorant text-xl font-light" style={{ color: V }}>
                  {sel.nombre ?? sel.email}
                </h2>
                <p className="font-dm text-xs text-[#1B4332]/50 mt-0.5">
                  Se apuntó el {fecha(sel.creadoIso)} · por {sel.origen}
                </p>
              </div>
              <button onClick={() => setSel(null)} className="text-[#1B4332]/40 hover:text-[#1B4332]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 font-dm text-sm">
              {[
                ["Correo", sel.email],
                ["WhatsApp", sel.whatsapp],
                ["Negocio", sel.tipoNegocio],
                ["Ciudad", sel.ciudad],
                ["Estado", sel.status === "activo" ? "Activo" : "Dado de baja"],
                ["Compró", sel.compro ? `Sí · $${(sel.montoMxn ?? 0).toLocaleString("es-MX")}` : sel.checkoutIniciado ? "Empezó el pago y no terminó" : "No"],
              ].map(([k, v]) => v ? (
                <div key={k as string} className="flex justify-between gap-4 border-b border-[#1B4332]/6 pb-2">
                  <span className="text-[#1B4332]/50">{k}</span>
                  <span className="text-[#1B4332] text-right">{v}</span>
                </div>
              ) : null)}

              <div>
                <p className="text-[#1B4332]/50 mb-2">
                  Correos que ya recibió ({sel.correos.length})
                </p>
                {sel.correos.length === 0 ? (
                  <p className="text-[#1B4332]/40 text-xs">Ninguno todavía.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sel.correos.map((c) => (
                      <span key={c} className="bg-[#FAFAF8] border border-[#1B4332]/10 rounded-sm px-2 py-1 font-mono text-[11px] text-[#1B4332]/70">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {sel.whatsapp && (
                  <a href={wa(sel)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1B4332] text-white px-4 py-2.5 rounded-sm text-sm hover:bg-[#2D5A45] transition-colors">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                <a href={`mailto:${sel.email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-[#1B4332]/20 text-[#1B4332] px-4 py-2.5 rounded-sm text-sm hover:border-[#1B4332] transition-colors">
                  <Mail className="w-4 h-4" /> Correo
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
