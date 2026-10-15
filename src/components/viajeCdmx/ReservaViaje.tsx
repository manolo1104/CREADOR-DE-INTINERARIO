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
import { ArrowLeft, CalendarDays, Check, Minus, Plus, Users } from "lucide-react";
import type { SalidaVista } from "@/lib/viajeCdmx/salidas";
import { diaMX, diaYMD, fechaLarga, montos, pesos, rangoCorto, rangoLargo, type SalidaPrecio } from "@/lib/viajeCdmx/precio";
import { ANTICIPO_PCT, CORTE_DIAS_ANTES, MAX_POR_APARTADO, NOCHES, PUNTO_SALIDA, mensajeWhatsApp } from "@/lib/viajeCdmx/config";
import { waLink } from "@/lib/whatsapp";
import { ga4ClientId, sessionId } from "@/lib/tourTracker";
import { TarjetaFecha } from "./TarjetaFecha";
import { ListaEspera } from "./ListaEspera";
import { medir, medirCompra } from "./medicion";
import type { CobroViaje, ResultadoPago } from "./PagoViaje";

// Stripe.js solo baja cuando alguien llega al pago.
const PagoViaje = dynamic(() => import("./PagoViaje"), {
  ssr: false,
  loading: () => <p className="text-sm font-dm text-verde-profundo/60 py-8 text-center">Cargando el pago seguro…</p>,
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
}: {
  salidasIniciales: SalidaVista[];
  estaSemana: number;
  liderInicial: string | null;
  fechaInicial: string | null;
}) {
  const [salidas, setSalidas] = useState(salidasIniciales);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [esperaId, setEsperaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState(2);
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
  const m = elegida ? montos(aPrecio(elegida), Math.min(personas, maxPersonas), new Date(), elegida.precioVigente) : null;

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
      setAviso("Esa fecha se acaba de llenar. Elige otra o anótate en su lista de espera.");
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
          precioVisto: elegida.precioVigente,
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
        setError(j.error || "No pudimos apartar tu lugar. Intenta de nuevo.");
        return;
      }
      setCobro(j as CobroViaje);
      setPaso("pago");
      medir("iniciar_checkout", { salida: elegida.fechaSalida, personas: m.personas, anticipo: j.anticipo, total: j.total });
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setError("Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function alResultado(r: ResultadoPago) {
    setResultado(r);
    setPaso("listo");
    if (r.estado === "pagado" && elegida) {
      medir("apartado_completado", { salida: elegida.fechaSalida, personas: r.personas, anticipo: r.anticipo, total: r.total, metodo: "tarjeta" });
      medirCompra({ folio: r.folio, anticipo: r.anticipo, total: r.total, personas: r.personas, nombre: `Viaje CDMX–Xilitla · ${rangoCorto(elegida.fechaSalida, elegida.fechaRegreso)}` });
    } else if (r.estado === "oxxo" && elegida) {
      medir("apartado_completado", { salida: elegida.fechaSalida, personas: cobro?.personas, anticipo: r.anticipo, metodo: "oxxo_ficha" });
    }
    refrescar();
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function alPerder(mensaje: string) {
    setCobro(null);
    setPaso("datos");
    setError(mensaje || "Tu apartado venció. Vuelve a intentarlo.");
    refrescar();
  }

  const fechasTexto = elegida ? rangoLargo(elegida.fechaSalida, elegida.fechaRegreso) : undefined;
  const campo = "w-full bg-white border border-verde-profundo/20 text-verde-profundo placeholder:text-verde-profundo/40 px-3 py-3 text-base font-dm focus:outline-none focus:border-verde-selva";

  return (
    <section id="fechas" ref={seccion} className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">Próximas salidas</p>
        <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(30px,4.5vw,48px)" }}>
          Elige tu <em className="text-dorado">fecha</em>
        </h2>
        <p className="text-sm text-crema/60 font-dm mt-2">Una salida al mes · 3 días y 2 noches · lugares limitados por camioneta</p>
        {estaSemana > 0 && (
          <p className="inline-block mt-4 text-xs font-dm text-crema/80 border border-white/15 px-3 py-1.5">
            {estaSemana} {estaSemana === 1 ? "persona apartó" : "personas apartaron"} su lugar esta semana
          </p>
        )}
        {lider && (
          <p className="block mt-3 text-xs font-dm text-dorado">Vienes con el grupo <strong>{lider}</strong>: tu lugar cuenta para tu líder.</p>
        )}
      </div>

      {aviso && <p className="text-center text-sm font-dm text-dorado mb-6" role="status">{aviso}</p>}

      {salidas.length === 0 ? (
        <div className="max-w-md mx-auto border border-white/10 bg-negro/40 p-6">
          <ListaEspera
            titulo="Las próximas fechas abren pronto"
            explicacion="Déjanos tu correo y te avisamos el día que abra la siguiente salida, con su precio de preventa."
          />
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
            />
          ))}
        </div>
      )}

      {salidaEspera && (
        <div ref={espera} className="max-w-md mx-auto mt-8 border border-white/10 bg-negro/50 p-6">
          <ListaEspera
            key={salidaEspera.id}
            salidaId={salidaEspera.id}
            titulo={salidaEspera.estado === "proxima" ? `Te avisamos cuando abra el ${rangoCorto(salidaEspera.fechaSalida, salidaEspera.fechaRegreso)}` : `Lista de espera · ${rangoCorto(salidaEspera.fechaSalida, salidaEspera.fechaRegreso)}`}
            explicacion={salidaEspera.estado === "proxima"
              ? "Te llega un correo el día que abra, cuando corre el precio de preventa."
              : "Si alguien libera su lugar te llega un correo al momento. Avisamos a toda la lista a la vez: el lugar es de quien aparte primero."}
          />
        </div>
      )}

      {elegida && m && (
        <div ref={panel} className="scroll-mt-20 mt-8 max-w-2xl mx-auto bg-crema text-verde-profundo p-5 sm:p-8">
          {paso !== "listo" && (
            <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-verde-profundo/15">
              <div>
                <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-1">Tu viaje</p>
                <p className="font-cormorant text-2xl leading-tight">{rangoLargo(elegida.fechaSalida, elegida.fechaRegreso)}</p>
                <p className="text-xs font-dm text-verde-profundo/60 mt-1 inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> Sales el {fechaLarga(elegida.fechaSalida)} a la medianoche, del {PUNTO_SALIDA.nombre}
                </p>
              </div>
              {paso === "pago" && (
                <button type="button" onClick={() => { soltarCobro(); setPaso("datos"); }} className="shrink-0 inline-flex items-center gap-1 text-xs font-dm text-verde-selva underline underline-offset-4 min-h-[44px]">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Cambiar
                </button>
              )}
            </div>
          )}

          {paso === "datos" && (
            <form onSubmit={continuar} className="space-y-5">
              <div>
                <p className="text-sm font-dm font-medium mb-2 inline-flex items-center gap-2"><Users className="w-4 h-4" aria-hidden="true" /> ¿Cuántos viajan?</p>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Una persona menos" onClick={() => setPersonas((p) => Math.max(1, Math.min(p, maxPersonas) - 1))} className="w-12 h-12 border border-verde-profundo/25 inline-flex items-center justify-center disabled:opacity-30" disabled={m.personas <= 1}>
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="font-cormorant text-3xl w-10 text-center tabular-nums" aria-live="polite">{m.personas}</span>
                  <button type="button" aria-label="Una persona más" onClick={() => setPersonas((p) => Math.min(maxPersonas, Math.min(p, maxPersonas) + 1))} className="w-12 h-12 border border-verde-profundo/25 inline-flex items-center justify-center disabled:opacity-30" disabled={m.personas >= maxPersonas}>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="text-xs font-dm text-verde-profundo/60">
                    {m.personas >= maxPersonas && elegida.disponibles <= MAX_POR_APARTADO
                      ? `Son los ${elegida.disponibles} que quedan`
                      : `${pesos(m.unitario)} por persona`}
                  </span>
                </div>
                {elegida.disponibles > MAX_POR_APARTADO && (
                  <p className="text-xs font-dm text-verde-profundo/55 mt-2">
                    ¿Son más de {MAX_POR_APARTADO}? <a href="#grupo" className="underline underline-offset-2">Arma tu grupo</a> y el líder viaja gratis.
                  </p>
                )}
              </div>

              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-dm text-verde-profundo/80">
                {["Transporte redondo", `${NOCHES} noches de hotel`, "3 desayunos", "Ruta Surrealista", "Expedición Tamul", "Guías, entradas y seguro"].map((x) => (
                  <li key={x} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-verde-selva shrink-0" aria-hidden="true" />{x}</li>
                ))}
              </ul>

              <dl className="border border-verde-profundo/15 divide-y divide-verde-profundo/10 text-sm font-dm">
                <div className="flex justify-between px-4 py-3"><dt>Total del viaje, todo incluido</dt><dd className="tabular-nums">{pesos(m.total)}</dd></div>
                <div className="flex justify-between px-4 py-3 bg-white/60"><dt className="font-medium">Hoy pagas ({ANTICIPO_PCT} %)</dt><dd className="font-cormorant text-2xl text-verde-selva tabular-nums">{pesos(m.anticipo)}</dd></div>
                <div className="flex justify-between px-4 py-3 text-verde-profundo/70"><dt>Resto, antes del {diaYMD(m.saldoVence)}</dt><dd className="tabular-nums">{pesos(m.saldo)}</dd></div>
              </dl>

              <div className="space-y-3">
                <p className="text-sm font-dm font-medium">Tus datos</p>
                <input className={campo} placeholder="Nombre completo" autoComplete="name" required minLength={2} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
                <input className={campo} placeholder="Correo (ahí te llega tu confirmación)" type="email" inputMode="email" autoComplete="email" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
                <input className={campo} placeholder="WhatsApp a 10 dígitos" type="tel" inputMode="tel" autoComplete="tel" required value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
              </div>

              <label className="flex items-start gap-3 text-xs font-dm text-verde-profundo/75 leading-relaxed cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-5 h-5 accent-verde-selva shrink-0" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
                <span>
                  Entiendo que el anticipo <strong>no es reembolsable pero sí transferible</strong> a otra fecha del viaje, y que si la salida no
                  junta el mínimo de viajeros a {CORTE_DIAS_ANTES} días de salir me ofrecen otra fecha o el reembolso del 100 %.
                </span>
              </label>

              {error && <p className="text-sm font-dm text-terracota" role="alert">{error}</p>}

              <button type="submit" disabled={enviando} className="w-full min-h-[52px] bg-verde-profundo text-crema hover:bg-verde-selva disabled:opacity-60 text-[12px] tracking-[2px] uppercase font-dm transition-colors">
                {enviando ? "Apartando tu lugar…" : `Apartar · pagar ${pesos(m.anticipo)}`}
              </button>
              <a
                href={waLink(mensajeWhatsApp(fechasTexto))}
                target="_blank"
                rel="noopener noreferrer"
                data-wa-manual="1"
                onClick={() => medir("click_whatsapp", { boton: "checkout", salida: elegida.fechaSalida })}
                className="block text-center text-xs font-dm text-verde-selva underline underline-offset-4"
              >
                ¿Prefieres transferencia o tienes dudas? Escríbenos por WhatsApp
              </a>
            </form>
          )}

          {paso === "pago" && cobro && (
            <PagoViaje cobro={cobro} datos={{ nombre: datos.nombre, email: datos.email }} onResultado={alResultado} onPerdido={alPerder} />
          )}

          {paso === "listo" && resultado && (
            <Resultado r={resultado} fechas={rangoLargo(elegida.fechaSalida, elegida.fechaRegreso)} email={datos.email} />
          )}
        </div>
      )}
    </section>
  );
}

function Resultado({ r, fechas, email }: { r: ResultadoPago; fechas: string; email: string }) {
  if (r.estado === "oxxo") {
    return (
      <div className="space-y-4" role="status">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva">Lugar apartado</p>
        <p className="font-cormorant text-3xl leading-tight">Paga tu ficha en OXXO</p>
        <p className="text-sm font-dm text-verde-profundo/75">
          Tu lugar en el viaje del <strong>{fechas}</strong> queda apartado mientras pagas <strong>{pesos(r.anticipo)}</strong> en cualquier OXXO,
          antes del <strong>{diaMX(r.vence)}</strong>. Te mandamos la ficha a <strong>{email}</strong>.
        </p>
        {r.voucherUrl && (
          <a href={r.voucherUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full min-h-[52px] bg-dorado text-negro text-[12px] tracking-[2px] uppercase font-dm">
            Ver mi ficha OXXO
          </a>
        )}
        <p className="text-xs font-dm text-verde-profundo/60">Cuando OXXO confirme el pago (hasta un día hábil) te llega tu folio por correo.</p>
      </div>
    );
  }
  if (r.estado === "procesando") {
    return (
      <div className="space-y-3" role="status">
        <p className="font-cormorant text-3xl leading-tight">Estamos confirmando tu pago</p>
        <p className="text-sm font-dm text-verde-profundo/75">En unos minutos te llega la confirmación a <strong>{email}</strong>. Si no llega, escríbenos por WhatsApp.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4" role="status">
      <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva">Listo</p>
      <p className="font-cormorant text-3xl leading-tight">Tu lugar está apartado</p>
      <dl className="border border-verde-profundo/15 divide-y divide-verde-profundo/10 text-sm font-dm">
        <div className="flex justify-between px-4 py-3"><dt>Folio</dt><dd className="font-medium">{r.folio}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>Fechas</dt><dd>{fechas}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>Viajeros</dt><dd>{r.personas}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>Pagaste</dt><dd className="text-verde-selva">{pesos(r.anticipo)}</dd></div>
        <div className="flex justify-between px-4 py-3"><dt>Resto</dt><dd>{pesos(r.saldo)}</dd></div>
      </dl>
      <p className="text-sm font-dm text-verde-profundo/75">
        Te mandamos todo a <strong>{email}</strong>. Unos días antes de que venza el resto te llega la liga para pagarlo.
      </p>
    </div>
  );
}
