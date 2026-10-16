"use client";

/**
 * Calendario + apartado del viaje CDMX–Xilitla.
 *
 * Fecha → viajeros y datos → pago del anticipo → listo. Los números (lugares,
 * precio, preventa) vienen del servidor (`SalidaVista`) y se vuelven a pedir al
 * elegir una fecha y cuando termina una preventa; la cuenta de dinero la hace
 * `montos()` de `precio.ts`, la misma función con la que cobra el servidor.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, BedDouble, CalendarDays, Check, Minus, Plus, Users } from "lucide-react";
import type { SalidaVista } from "@/lib/viajeCdmx/salidas";
import { montos, rangoCorto, type SalidaPrecio } from "@/lib/viajeCdmx/precio";
import { CUARTOS, MAX_POR_APARTADO, precioCuarto, type CompartirCon, type Cuarto, type Locale } from "@/lib/viajeCdmx/config";
import { textosViaje, type TextosViaje } from "./textos";
import { waLink } from "@/lib/whatsapp";
import { ga4ClientId, sessionId } from "@/lib/tourTracker";
import { TarjetaFecha } from "./TarjetaFecha";
import { ListaEspera } from "./ListaEspera";
import { medir, medirCompra } from "./medicion";
import type { CobroViaje, ResultadoPago } from "./PagoViaje";

// Stripe.js solo baja cuando alguien llega al pago.
const PagoViaje = dynamic(() => import("./PagoViaje"), {
  ssr: false,
  loading: () => <p className="text-sm font-dm text-verde-profundo/60 py-8 text-center">…</p>,
});

type Paso = "datos" | "pago" | "listo";

const aPrecio = (s: SalidaVista): SalidaPrecio => ({
  fechaSalida: s.fechaSalida, fechaRegreso: s.fechaRegreso, capacidad: s.capacidad,
  precio: s.precio, precioPreventa: s.precioPreventa, abreEl: s.abreEl, finPreventa: s.finPreventa,
  fechaCorte: s.fechaCorte, saldoDiasAntes: s.saldoDiasAntes, estado: s.estadoBase,
});

const seVende = (s?: SalidaVista | null) => !!s && (s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos");

const LLAVE_LIDER = "viaje_cdmx_lider";

export function ReservaViaje({
  salidasIniciales,
  estaSemana,
  liderInicial,
  fechaInicial,
  locale = "es",
  usd = null,
}: {
  salidasIniciales: SalidaVista[];
  estaSemana: number;
  liderInicial: string | null;
  fechaInicial: string | null;
  locale?: Locale;
  /** Pesos por dólar (página en inglés): el precio aproximado en dólares. */
  usd?: number | null;
}) {
  const t = textosViaje(locale);
  const en = locale === "en";
  const [salidas, setSalidas] = useState(salidasIniciales);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [esperaId, setEsperaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState(2);
  const [cuarto, setCuarto] = useState<Cuarto>("compartido");
  const [compartirCon, setCompartirCon] = useState<CompartirCon | null>(null);
  const [paso, setPaso] = useState<Paso>("datos");
  const [datos, setDatos] = useState({ nombre: "", email: "", telefono: "" });
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cobro, setCobro] = useState<CobroViaje | null>(null);
  const [resultado, setResultado] = useState<ResultadoPago | null>(null);
  const [lider, setLider] = useState<string | null>(liderInicial);
  const seccion = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const espera = useRef<HTMLDivElement>(null);

  const elegida = salidas.find((s) => s.id === elegidaId) ?? null;
  const salidaEspera = salidas.find((s) => s.id === esperaId) ?? null;
  const maxPersonas = elegida ? Math.max(1, Math.min(MAX_POR_APARTADO, elegida.disponibles)) : MAX_POR_APARTADO;
  // El precio por persona con el cuarto elegido: el mismo cálculo que hace el servidor (`precioCuarto`).
  const unitario = elegida ? precioCuarto(elegida.precioVigente, cuarto) : 0;
  const m = elegida ? montos(aPrecio(elegida), Math.min(personas, maxPersonas), new Date(), unitario) : null;
  const pideCompania = !!m && m.personas === 1 && cuarto === "compartido";

  // El código del líder sobrevive a recargar la página (llega por la liga que compartió).
  useEffect(() => {
    try {
      if (liderInicial) sessionStorage.setItem(LLAVE_LIDER, liderInicial);
      else setLider(sessionStorage.getItem(LLAVE_LIDER));
    } catch { /* sin almacenamiento: solo vale en esta visita */ }
  }, [liderInicial]);

  // «ver_fecha»: una vez, cuando el calendario entra en pantalla.
  useEffect(() => {
    const el = seccion.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        medir("ver_fecha", { fechas: salidasIniciales.length });
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [salidasIniciales.length]);

  const refrescar = useCallback(async (): Promise<SalidaVista[] | null> => {
    try {
      const r = await fetch("/api/viaje-cdmx/salidas", { cache: "no-store" });
      if (!r.ok) return null;
      const j = await r.json();
      setSalidas(j.salidas);
      return j.salidas as SalidaVista[];
    } catch {
      return null;
    }
  }, []);

  const elegir = useCallback(async (id: string, desplazar = true) => {
    setElegidaId(id);
    setEsperaId(null);
    setPaso("datos");
    setError("");
    setAviso("");
    const s = salidas.find((x) => x.id === id);
    if (s) medir("seleccionar_fecha", { salida: s.fechaSalida, precio: s.precioVigente, disponibles: s.disponibles });
    if (desplazar) requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    const frescas = await refrescar();
    const f = frescas?.find((x) => x.id === id);
    if (frescas && !seVende(f)) {
      setElegidaId(null);
      setAviso(t.seLleno);
    }
  }, [salidas, refrescar]);

  // Una liga con ?fecha=AAAA-MM-DD (el correo de la lista de espera) llega con la fecha puesta.
  useEffect(() => {
    if (!fechaInicial) return;
    const s = salidasIniciales.find((x) => x.fechaSalida === fechaInicial);
    if (s && seVende(s)) elegir(s.id, true);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pedirEspera = (id: string) => {
    setEsperaId(id);
    requestAnimationFrame(() => espera.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  async function soltarCobro() {
    if (!cobro) return;
    fetch("/api/viaje-cdmx/apartado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "soltar", holdId: cobro.holdId, paymentIntentId: cobro.paymentIntentId }),
      keepalive: true,
    }).catch(() => {});
    setCobro(null);
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegida || !m) return;
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const r = await fetch("/api/viaje-cdmx/apartar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salidaId: elegida.id,
          personas: m.personas,
          ...datos,
          liderCodigo: lider,
          precioVisto: unitario,
          cuarto,
          compartirCon: pideCompania ? compartirCon : null,
          locale,
          aceptaTerminos: acepta,
          sid: sessionId(),
          gaClientId: ga4ClientId(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.codigo === "precio-cambio" || j.codigo === "sin-lugar" || j.codigo === "cerrada") {
          const frescas = await refrescar();
          if (j.codigo === "sin-lugar" && frescas && !seVende(frescas.find((x) => x.id === elegida.id))) setElegidaId(null);
        }
        setError((en ? t.errores[j.codigo] : j.error) || t.errorApartar);
        return;
      }
      setCobro(j as CobroViaje);
      setPaso("pago");
      medir("iniciar_checkout", { salida: elegida.fechaSalida, personas: m.personas, anticipo: j.anticipo, total: j.total });
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setError(t.errorRed);
    } finally {
      setEnviando(false);
    }
  }

  function alResultado(r: ResultadoPago) {
    setResultado(r);
    setPaso("listo");
    if (r.estado === "pagado" && elegida) {
      medir("apartado_completado", { salida: elegida.fechaSalida, personas: r.personas, anticipo: r.anticipo, total: r.total, metodo: "tarjeta" });
      medirCompra({ folio: r.folio, anticipo: r.anticipo, total: r.total, personas: r.personas, nombre: `Viaje CDMX–Xilitla · ${rangoCorto(elegida.fechaSalida, elegida.fechaRegreso)}${cuarto === "privado" ? " · privado" : ""}` });
    } else if (r.estado === "oxxo" && elegida) {
      medir("apartado_completado", { salida: elegida.fechaSalida, personas: cobro?.personas, anticipo: r.anticipo, metodo: "oxxo_ficha" });
    }
    refrescar();
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function alPerder(mensaje: string) {
    setCobro(null);
    setPaso("datos");
    setError((en ? "" : mensaje) || t.vencio);
    refrescar();
  }

  const fechasTexto = elegida ? t.rangoLargo(elegida.fechaSalida, elegida.fechaRegreso) : undefined;
  const campo = "w-full bg-white border border-verde-profundo/20 text-verde-profundo placeholder:text-verde-profundo/40 px-3 py-3 text-base font-dm focus:outline-none focus:border-verde-selva";

  return (
    <section id="fechas" ref={seccion} className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">{t.proximas}</p>
        <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>
          {t.elige} <em className="text-dorado">{t.fecha}</em>
        </h2>
        <p className="text-sm text-crema/60 font-dm mt-2">{t.subtitulo}</p>
        {estaSemana > 0 && (
          <p className="inline-block mt-4 text-xs font-dm text-crema/80 border border-white/15 px-3 py-1.5">{t.estaSemana(estaSemana)}</p>
        )}
        {lider && <p className="block mt-3 text-xs font-dm text-dorado">{t.conLider(lider)}</p>}
      </div>

      {aviso && <p className="text-center text-sm font-dm text-dorado mb-6" role="status">{aviso}</p>}

      {salidas.length === 0 ? (
        <div className="max-w-md mx-auto border border-white/10 bg-negro/40 p-6">
          <ListaEspera titulo={t.sinFechasTitulo} explicacion={t.sinFechasTexto} locale={locale} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salidas.map((s) => (
            <TarjetaFecha
              key={s.id}
              s={s}
              elegida={s.id === elegidaId}
              onElegir={() => (cobro ? (soltarCobro(), elegir(s.id)) : elegir(s.id))}
              onEspera={() => pedirEspera(s.id)}
              onCambioDePrecio={refrescar}
              locale={locale}
              usd={usd}
            />
          ))}
        </div>
      )}

      {salidaEspera && (
        <div ref={espera} className="max-w-md mx-auto mt-8 border border-white/10 bg-negro/50 p-6">
          <ListaEspera
            key={salidaEspera.id}
            salidaId={salidaEspera.id}
            titulo={salidaEspera.estado === "proxima" ? t.esperaAbre(t.rangoCorto(salidaEspera.fechaSalida, salidaEspera.fechaRegreso)) : t.esperaLista(t.rangoCorto(salidaEspera.fechaSalida, salidaEspera.fechaRegreso))}
            explicacion={salidaEspera.estado === "proxima" ? t.esperaAbreTexto : t.esperaListaTexto}
            locale={locale}
          />
        </div>
      )}

      {elegida && m && (
        <div ref={panel} className="scroll-mt-20 mt-8 max-w-2xl mx-auto bg-crema text-verde-profundo p-5 sm:p-8">
          {paso !== "listo" && (
            <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-verde-profundo/15">
              <div>
                <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-1">{t.tuViaje}</p>
                <p className="font-cormorant text-2xl leading-tight">{t.rangoLargo(elegida.fechaSalida, elegida.fechaRegreso)}</p>
                <p className="text-xs font-dm text-verde-profundo/60 mt-1 inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> {t.salesEl(elegida.fechaSalida)}
                </p>
              </div>
              {paso === "pago" && (
                <button type="button" onClick={() => { soltarCobro(); setPaso("datos"); }} className="shrink-0 inline-flex items-center gap-1 text-xs font-dm text-verde-selva underline underline-offset-4 min-h-[44px]">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> {t.cambiar}
                </button>
              )}
            </div>
          )}

          {paso === "datos" && (
            <form onSubmit={continuar} className="space-y-5">
              <div>
                <p className="text-sm font-dm font-medium mb-2 inline-flex items-center gap-2"><Users className="w-4 h-4" aria-hidden="true" /> {t.cuantos}</p>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={t.menos} onClick={() => setPersonas((p) => Math.max(1, Math.min(p, maxPersonas) - 1))} className="w-12 h-12 border border-verde-profundo/25 inline-flex items-center justify-center disabled:opacity-30" disabled={m.personas <= 1}>
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="font-cormorant text-3xl w-10 text-center tabular-nums" aria-live="polite">{m.personas}</span>
                  <button type="button" aria-label={t.mas} onClick={() => setPersonas((p) => Math.min(maxPersonas, Math.min(p, maxPersonas) + 1))} className="w-12 h-12 border border-verde-profundo/25 inline-flex items-center justify-center disabled:opacity-30" disabled={m.personas >= maxPersonas}>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="text-xs font-dm text-verde-profundo/60">
                    {m.personas >= maxPersonas && elegida.disponibles <= MAX_POR_APARTADO
                      ? t.quedanTodos(elegida.disponibles)
                      : t.porPersona(m.unitario)}
                  </span>
                </div>
                {elegida.disponibles > MAX_POR_APARTADO && (
                  <p className="text-xs font-dm text-verde-profundo/55 mt-2">{t.grupoGrande}</p>
                )}
              </div>

              {/* El cuarto (16 oct 2026): compartido al precio de la fecha, o privado con cama king. */}
              <fieldset>
                <legend className="text-sm font-dm font-medium mb-2 inline-flex items-center gap-2"><BedDouble className="w-4 h-4" aria-hidden="true" /> {t.cuartoPregunta}</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(["compartido", "privado"] as Cuarto[]).map((c) => {
                    const precio = precioCuarto(elegida.precioVigente, c);
                    return (
                      <label key={c} className={`flex flex-col gap-1 border p-3 cursor-pointer transition-colors ${cuarto === c ? "border-verde-selva bg-white" : "border-verde-profundo/20 hover:border-verde-profundo/40"}`}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-dm font-medium">
                            <input type="radio" name="cuarto" value={c} checked={cuarto === c} onChange={() => setCuarto(c)} className="w-4 h-4 accent-verde-selva" />
                            {CUARTOS[c][locale].titulo}
                          </span>
                          <span className="font-cormorant text-xl text-verde-selva tabular-nums whitespace-nowrap">{t.pesos(precio)}</span>
                        </span>
                        <span className="text-xs font-dm text-verde-profundo/65 leading-relaxed">{CUARTOS[c][locale].detalle}</span>
                        {usd ? <span className="text-[11px] font-dm text-verde-profundo/50">≈ US${Math.round(precio / usd).toLocaleString("en-US")} per person</span> : null}
                      </label>
                    );
                  })}
                </div>
                {pideCompania && (
                  <div className="mt-3">
                    <p className="text-xs font-dm text-verde-profundo/75 mb-1.5">{t.compartirPregunta}</p>
                    <div className="flex gap-2">
                      {(["mujeres", "hombres"] as CompartirCon[]).map((g) => (
                        <label key={g} className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] border text-sm font-dm cursor-pointer ${compartirCon === g ? "border-verde-selva bg-white" : "border-verde-profundo/20"}`}>
                          <input type="radio" name="compartirCon" value={g} checked={compartirCon === g} onChange={() => setCompartirCon(g)} required={pideCompania} className="w-4 h-4 accent-verde-selva" />
                          {g === "mujeres" ? t.mujeres : t.hombres}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </fieldset>

              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-dm text-verde-profundo/80">
                {t.incluye.map((x) => (
                  <li key={x} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-verde-selva shrink-0" aria-hidden="true" />{x}</li>
                ))}
              </ul>

              <dl className="border border-verde-profundo/15 divide-y divide-verde-profundo/10 text-sm font-dm">
                <div className="flex justify-between px-4 py-3"><dt>{t.total}</dt><dd className="tabular-nums">{t.pesos(m.total)}</dd></div>
                <div className="flex justify-between px-4 py-3 bg-white/60"><dt className="font-medium">{t.hoyPagas}</dt><dd className="font-cormorant text-2xl text-verde-selva tabular-nums">{t.pesos(m.anticipo)}</dd></div>
                <div className="flex justify-between px-4 py-3 text-verde-profundo/70"><dt>{t.resto(m.saldoVence)}</dt><dd className="tabular-nums">{t.pesos(m.saldo)}</dd></div>
                {usd ? <div className="flex justify-between px-4 py-2 text-[11px] text-verde-profundo/55"><dt>Approx. in US dollars (charged in pesos)</dt><dd className="tabular-nums">≈ US${Math.round(m.total / usd).toLocaleString("en-US")}</dd></div> : null}
              </dl>

              <div className="space-y-3">
                <p className="text-sm font-dm font-medium">{t.tusDatos}</p>
                <input className={campo} placeholder={t.phNombre} autoComplete="name" required minLength={2} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
                <input className={campo} placeholder={t.phCorreo} type="email" inputMode="email" autoComplete="email" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
                <input className={campo} placeholder={t.phWhatsapp} type="tel" inputMode="tel" autoComplete="tel" required value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
              </div>

              <label className="flex items-start gap-3 text-xs font-dm text-verde-profundo/75 leading-relaxed cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-5 h-5 accent-verde-selva shrink-0" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
                <span>{t.acepto}</span>
              </label>

              {error && <p className="text-sm font-dm text-terracota" role="alert">{error}</p>}

              <button type="submit" disabled={enviando} className="w-full min-h-[52px] bg-verde-profundo text-crema hover:bg-verde-selva disabled:opacity-60 text-[12px] tracking-[2px] uppercase font-dm transition-colors">
                {enviando ? t.apartando : t.apartar(m.anticipo)}
              </button>
              <a
                href={waLink(t.whatsapp(fechasTexto))}
                target="_blank"
                rel="noopener noreferrer"
                data-wa-manual="1"
                onClick={() => medir("click_whatsapp", { boton: "checkout", salida: elegida.fechaSalida })}
                className="block text-center text-xs font-dm text-verde-selva underline underline-offset-4"
              >
                {t.dudas}
              </a>
            </form>
          )}

          {paso === "pago" && cobro && (
            <PagoViaje cobro={cobro} datos={{ nombre: datos.nombre, email: datos.email }} onResultado={alResultado} onPerdido={alPerder} locale={locale} />
          )}

          {paso === "listo" && resultado && (
            <Resultado r={resultado} fechas={t.rangoLargo(elegida.fechaSalida, elegida.fechaRegreso)} email={datos.email} t={t} cuarto={CUARTOS[cuarto][locale].titulo} />
          )}
        </div>
      )}
    </section>
  );
}

function Resultado({ r, fechas, email, t, cuarto }: { r: ResultadoPago; fechas: string; email: string; t: TextosViaje; cuarto: string }) {
  if (r.estado === "oxxo") {
    return (
      <div className="space-y-4" role="status">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva">{t.apartadoOxxo}</p>
        <p className="font-cormorant text-3xl leading-tight">{t.pagaOxxo}</p>
        <p className="text-sm font-dm text-verde-profundo/75">{t.oxxoTexto(fechas, r.anticipo, r.vence, email)}</p>
        {r.voucherUrl && (
          <a href={r.voucherUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full min-h-[52px] bg-dorado text-negro text-[12px] tracking-[2px] uppercase font-dm">
            {t.verFicha}
          </a>
        )}
        <p className="text-xs font-dm text-verde-profundo/60">{t.oxxoConfirma}</p>
      </div>
    );
  }
  if (r.estado === "procesando") {
    return (
      <div className="space-y-3" role="status">
        <p className="font-cormorant text-3xl leading-tight">{t.confirmando}</p>
        <p className="text-sm font-dm text-verde-profundo/75">{t.confirmandoTexto(email)}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4" role="status">
      <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva">{t.listo}</p>
      <p className="font-cormorant text-3xl leading-tight">{t.apartado}</p>
      <dl className="border border-verde-profundo/15 divide-y divide-verde-profundo/10 text-sm font-dm">
        <div className="flex justify-between px-4 py-3"><dt>{t.folio}</dt><dd className="font-medium">{r.folio}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>{t.fechas}</dt><dd>{fechas}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>{t.viajeros}</dt><dd>{r.personas}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>{t.cuarto}</dt><dd>{cuarto}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>{t.pagaste}</dt><dd className="text-verde-selva">{t.pesos(r.anticipo)}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>{t.restoCorto}</dt><dd>{t.pesos(r.saldo)}</dd></div>
      </dl>
      <p className="text-sm font-dm text-verde-profundo/75">{t.listoTexto(email)}</p>
    </div>
  );
}
