"use client";

import { useEffect, useState } from "react";
import { Link2, Copy, Check, Ban, ExternalLink, Loader2, MessageCircle, Search } from "lucide-react";

interface ReservaConSaldo {
  id: string; folio: string; cliente: string; tour: string; fecha: string;
  total: number; cobrado: number; saldo: number; personas: number;
}

interface Cotizacion {
  id: string; folio: string; cliente: string; tour: string; fecha: string;
  total: number; estado: string; personas: number;
}

/** Para qué es el cobro. Cambia qué se busca, el monto sugerido y el título. */
type Proposito = "anticipo" | "resto" | "suelto";

/** Los anticipos que ya usa el negocio: 30% en el sitio, 50% en cotizaciones. */
const ANTICIPOS = [30, 50] as const;

interface Cobro {
  id: string; titulo: string; monto: number; estado: string; url: string;
  cliente: string | null; nota: string | null; createdAt: string;
  pagadoAt: string | null; montoPagado: number | null; correoDelPagador: string | null;
  creadoPor: string | null; folio: string | null; clienteReserva: string | null;
}

const fmx = (n: number) => `$${Math.round(n ?? 0).toLocaleString("es-MX")}`;

/**
 * Para comparar texto escrito a las prisas.
 *
 * Nadie teclea "Lucía" con acento cuando está buscando rápido en el chat, y una
 * búsqueda que no encuentra a la clienta obliga a leer la lista entera: justo
 * lo que el buscador venía a evitar.
 */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio",
  "agosto","septiembre","octubre","noviembre","diciembre"];

/** "25 de octubre" — sin año, que en un cobro del mismo año sobra. */
function fechaLarga(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [a, m, d] = ymd.split("-").map(Number);
  const esteAno = new Date().getFullYear();
  return `${d} de ${MESES_LARGOS[m - 1]}${a !== esteAno ? ` de ${a}` : ""}`;
}
const fFecha = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};

export default function CobrosClient(
  { reservasConSaldo, cotizaciones = [] }:
  { reservasConSaldo: ReservaConSaldo[]; cotizaciones?: Cotizacion[] },
) {
  const [cobros, setCobros]   = useState<Cobro[]>([]);
  const [cargando, setCargando] = useState(true);

  const [proposito, setProposito] = useState<Proposito>("anticipo");
  const [titulo, setTitulo]   = useState("");
  const [monto, setMonto]     = useState("");
  const [cliente, setCliente] = useState("");
  const [reservaId, setReservaId] = useState("");
  const [cotizacionId, setCotizacionId] = useState("");
  /** Lo que se teclea para encontrar la cotización: las listas de 200 no se leen. */
  const [busqueda, setBusqueda] = useState("");
  /** true = Manolo escribió el título a mano; deja de armarse solo. */
  const [tituloTocado, setTituloTocado] = useState(false);
  const [detalle, setDetalle] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError]     = useState("");
  const [reciente, setReciente] = useState<{ url: string; titulo: string; monto: number } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const r = await fetch("/api/admin/links-pago");
    if (r.ok) setCobros(await r.json());
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  const reserva    = reservasConSaldo.find(r => r.id === reservaId);
  const cotizacion = cotizaciones.find(c => c.id === cotizacionId);

  /**
   * Las cotizaciones que coinciden con lo tecleado.
   *
   * Sin buscador esto sería una lista de 200 renglones donde nadie encuentra a
   * nadie. Se busca por nombre porque es lo que uno recuerda del chat, y
   * también por folio por si el cliente lo trae a la mano.
   */
  const encontradas = (() => {
    const q = normalizar(busqueda);
    if (!q) return cotizaciones.slice(0, 6);   // las más recientes, para arrancar
    return cotizaciones
      .filter(c =>
        normalizar(c.cliente).includes(q) ||
        normalizar(c.folio).includes(q) ||
        normalizar(c.tour || "").includes(q))
      .slice(0, 8);
  })();

  /**
   * El nombre del tour, corto.
   *
   * En la base los tours se llaman "Ruta Surrealista — Edward James,
   * Manantiales, Cuevas y Castillo", y una reserva de dos tours los pega con
   * " + ". Puesto tal cual en la pantalla de pago, el cliente ve un párrafo en
   * vez de saber qué está pagando.
   */
  function nombreCorto(tour: string): string {
    if (!tour) return "tu tour";
    const partes = tour.split(" + ");
    const primero = partes[0].split("—")[0].split(":")[0].trim();
    if (partes.length > 1) return `${primero} y ${partes.length - 1} tour${partes.length > 2 ? "s" : ""} más`;
    return primero.slice(0, 48);
  }


  /**
   * La línea que Stripe enseña bajo el concepto.
   *
   * El cliente abre la liga en su teléfono, a veces días después de la
   * conversación. Ver su nombre, cuánta gente va y cuándo sale le confirma que
   * está pagando SU viaje: es la diferencia entre pagar con confianza y
   * escribir "oye, ¿esto qué es?".
   */
  function detalleDe(x: { cliente: string; personas: number; fecha: string; folio: string; tour: string }): string {
    const partes = [x.cliente];
    if (x.personas > 0) partes.push(`${x.personas} ${x.personas === 1 ? "persona" : "personas"}`);
    const cuando = fechaLarga(x.fecha);
    if (cuando) partes.push(`sale el ${cuando}`);
    partes.push(x.folio);
    return partes.join(" · ");
  }

  /** Cambiar de propósito limpia lo elegido antes: mezclarlos cobra al que no era. */
  function cambiarProposito(p: Proposito) {
    setProposito(p);
    setReservaId(""); setCotizacionId(""); setBusqueda("");
    setMonto(""); setCliente(""); setDetalle("");
    if (!tituloTocado) setTitulo("");
  }

  /** Elegir la reserva a la que se le cobra lo que falta. */
  function elegirReserva(id: string) {
    setReservaId(id);
    const r = reservasConSaldo.find(x => x.id === id);
    if (!r) return;
    setMonto(String(r.saldo));
    setCliente(r.cliente);
    setDetalle(detalleDe(r));
    if (!tituloTocado) setTitulo(`Pago restante de ${nombreCorto(r.tour)}`);
  }

  /** Elegir la cotización a la que se le cobra el anticipo. */
  function elegirCotizacion(id: string, pct = 50) {
    setCotizacionId(id);
    const c = cotizaciones.find(x => x.id === id);
    if (!c) return;
    setMonto(String(Math.round(c.total * (pct / 100))));
    setCliente(c.cliente);
    setDetalle(detalleDe(c));
    if (!tituloTocado) setTitulo(`Anticipo ${pct}% de ${nombreCorto(c.tour)}`);
  }

  /** Cambiar el porcentaje del anticipo ya elegido. */
  function cambiarPct(pct: number) {
    if (!cotizacion) return;
    setMonto(String(Math.round(cotizacion.total * (pct / 100))));
    if (!tituloTocado) setTitulo(`Anticipo ${pct}% de ${nombreCorto(cotizacion.tour)}`);
  }

  async function crear() {
    setCreando(true); setError(""); setReciente(null);
    const res = await fetch("/api/admin/links-pago", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo, detalle: detalle || undefined, monto: Number(monto),
        cliente: cliente || undefined,
        reservaId:    reservaId || undefined,
        cotizacionId: cotizacionId || undefined,
      }),
    });
    const d = await res.json();
    setCreando(false);
    if (res.ok) {
      setReciente(d.link);
      setTitulo(""); setMonto(""); setCliente(""); setDetalle("");
      setReservaId(""); setCotizacionId(""); setBusqueda(""); setTituloTocado(false);
      cargar();
    } else setError(d.error ?? "No se pudo crear el cobro");
  }

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1800);
    } catch { /* algunos navegadores lo bloquean sin permiso */ }
  }

  async function cancelar(id: string) {
    if (!window.confirm("¿Cancelar este cobro? La liga dejará de funcionar.")) return;
    const r = await fetch("/api/admin/links-pago", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (r.ok) cargar();
    else setError((await r.json()).error ?? "No se pudo cancelar");
  }

  /**
   * El mensaje que se manda por WhatsApp.
   *
   * Sin emojis a propósito: es un cobro, y los adornos le quitan seriedad justo
   * en el momento en que el cliente decide meter su tarjeta. Lo que sí lleva es
   * estructura, para que se lea de un vistazo en el chat: qué es, cuánto, la
   * liga, y cómo se paga.
   */
  const mensajeWA = (c: { titulo: string; monto: number; url: string }) =>
    `https://wa.me/?text=${encodeURIComponent(
      `Hola, aquí está tu liga de pago.\n\n` +
      `Concepto: ${c.titulo}\n` +
      `Monto: ${fmx(c.monto)} MXN\n\n` +
      `${c.url}\n\n` +
      `Se paga con tarjeta de crédito o débito. En cuanto entre el pago te confirmamos por este medio.\n\n` +
      `Tours Huasteca Potosina`,
    )}`;

  const activos = cobros.filter(c => c.estado === "activo");
  const pagados = cobros.filter(c => c.estado === "pagado");
  const totalPagado = pagados.reduce((s, c) => s + (c.montoPagado ?? c.monto), 0);

  return (
    <div className="px-5 sm:px-7 py-6 max-w-[1100px] mx-auto">
      <h1 className="font-cormorant text-[#16362a] text-[28px] leading-none font-light mb-1">Cobros</h1>
      <p className="text-[rgba(22,54,42,0.66)] font-dm text-sm mb-6">
        Una liga de pago para mandar por WhatsApp. El cliente paga con tarjeta y aquí ves cuándo lo hizo.
      </p>

      {/* ── Crear ────────────────────────────────────────────────────────── */}
      <div className="panel-card panel-card-alta p-5 mb-6">
        <h2 className="font-cormorant text-[#16362a] text-lg font-light mb-4">Nuevo cobro</h2>

        {/* ── Para qué es el cobro ───────────────────────────────────────
            Primero el propósito: el anticipo se cobra sobre una COTIZACIÓN
            (todavía no hay reserva) y lo que falta, sobre una reserva ya hecha.
            Mezclarlos es lo que hace que se cobre dos veces lo mismo. */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            ["anticipo", "Anticipo de una cotización"],
            ["resto",    "Lo que falta de una reserva"],
            ["suelto",   "Un cobro suelto"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => cambiarProposito(id)}
              className={`px-3 py-2 text-[12px] font-dm rounded-[7px] border panel-pulsable panel-foco ${
                proposito === id
                  ? "bg-[#1B4332] text-white border-[#1B4332]"
                  : "bg-white border-[rgba(27,67,50,0.15)] text-[rgba(22,54,42,0.66)] hover:border-[rgba(27,67,50,0.35)]"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Anticipo: buscador de cotizaciones ──────────────────────────── */}
        {proposito === "anticipo" && (
          <div className="mb-4">
            <label className="panel-eyebrow block mb-1.5" htmlFor="buscar">Busca la cotización por cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(22,54,42,0.35)]" strokeWidth={1.75} />
              <input id="buscar" value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setCotizacionId(""); }}
                placeholder="Escribe el nombre del cliente, el folio o el tour"
                className="w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm pl-9 pr-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] placeholder:text-[rgba(22,54,42,0.35)]" />
            </div>

            {cotizaciones.length === 0 ? (
              <p className="text-[rgba(22,54,42,0.51)] font-dm text-xs mt-2">
                No hay cotizaciones abiertas. Usa “un cobro suelto”.
              </p>
            ) : !cotizacion ? (
              <>
                <p className="text-[11px] font-dm text-[rgba(22,54,42,0.42)] mt-2 mb-1.5">
                  {busqueda.trim()
                    ? `${encontradas.length} ${encontradas.length === 1 ? "coincidencia" : "coincidencias"}`
                    : "Las más recientes"}
                </p>
                <div className="border border-[rgba(27,67,50,0.12)] rounded-[7px] overflow-hidden divide-y divide-[rgba(27,67,50,0.07)]">
                  {encontradas.length === 0 && (
                    <p className="px-3 py-3 text-xs font-dm text-[rgba(22,54,42,0.51)]">
                      Ninguna cotización coincide con “{busqueda}”.
                    </p>
                  )}
                  {encontradas.map(c => (
                    <button key={c.id} onClick={() => elegirCotizacion(c.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FAFAF8] panel-pulsable panel-foco flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-dm text-[#16362a] truncate">{c.cliente}</span>
                        <span className="block text-[11px] font-dm text-[rgba(22,54,42,0.51)] truncate">
                          {c.folio} · {nombreCorto(c.tour)}
                        </span>
                      </span>
                      <span className="panel-cifra text-sm font-dm text-[#16362a] flex-shrink-0">{fmx(c.total)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-2.5 panel-card px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-dm text-[#16362a] truncate">{cotizacion.cliente}</p>
                    <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] truncate">
                      {cotizacion.folio} · {nombreCorto(cotizacion.tour)} · total {fmx(cotizacion.total)}
                    </p>
                  </div>
                  <button onClick={() => { setCotizacionId(""); setMonto(""); }}
                    className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] hover:text-[#16362a] panel-foco rounded-[7px] px-1">
                    cambiar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="panel-eyebrow mr-1">Anticipo</span>
                  {ANTICIPOS.map(pct => {
                    const valor = Math.round(cotizacion.total * (pct / 100));
                    return (
                      <button key={pct} onClick={() => cambiarPct(pct)}
                        className={`px-2.5 py-1.5 text-[11px] font-dm rounded-[7px] border panel-pulsable panel-foco ${
                          Number(monto) === valor
                            ? "bg-[#1B4332]/10 border-[#1B4332]/35 text-[#16362a]"
                            : "bg-white border-[rgba(27,67,50,0.12)] text-[rgba(22,54,42,0.66)]"
                        }`}>
                        {pct}% · {fmx(valor)}
                      </button>
                    );
                  })}
                  <span className="text-[11px] font-dm text-[rgba(22,54,42,0.42)]">o escribe otro monto abajo</span>
                </div>
                <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-2">
                  Al pagarse, la cotización queda marcada como aceptada.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Lo que falta: reservas con saldo ────────────────────────────── */}
        {proposito === "resto" && (
          <div className="mb-4">
            <label className="panel-eyebrow block mb-1.5" htmlFor="reserva">¿De qué reserva?</label>
            {reservasConSaldo.length === 0 ? (
              <p className="text-[rgba(22,54,42,0.51)] font-dm text-xs py-2">
                Ninguna reserva tiene saldo pendiente: todas están pagadas.
              </p>
            ) : (
              <select id="reserva" value={reservaId} onChange={e => elegirReserva(e.target.value)}
                className="w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm px-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] bg-white">
                <option value="">Elige una reserva…</option>
                {reservasConSaldo.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.folio} · {r.cliente} · debe {fmx(r.saldo)}
                  </option>
                ))}
              </select>
            )}

            {reserva && (
              <div className="mt-2.5 panel-card px-3.5 py-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs font-dm">
                  <span className="text-[rgba(22,54,42,0.51)]">
                    Total <strong className="panel-cifra text-[#16362a] font-medium">{fmx(reserva.total)}</strong>
                  </span>
                  <span className="text-[rgba(22,54,42,0.51)]">
                    Ya pagó <strong className="panel-cifra text-[#2b845c] font-medium">{fmx(reserva.cobrado)}</strong>
                  </span>
                  <span className="text-[rgba(22,54,42,0.51)]">
                    Debe <strong className="panel-cifra text-[#16362a] font-medium">{fmx(reserva.saldo)}</strong>
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[rgba(27,67,50,0.08)] overflow-hidden">
                  <div className="h-full bg-[#2b845c]"
                       style={{ width: `${Math.min(100, Math.round((reserva.cobrado / Math.max(1, reserva.total)) * 100))}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-3">
          <div>
            <label className="panel-eyebrow block mb-1.5" htmlFor="titulo">¿De qué es el cobro?</label>
            <input id="titulo" value={titulo}
              onChange={e => { setTitulo(e.target.value); setTituloTocado(true); }}
              placeholder="Anticipo Expedición Tamul, 4 personas"
              className="w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm px-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] placeholder:text-[rgba(22,54,42,0.35)]" />
            <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-1.5">
              Es lo que el cliente va a ver al pagar.
            </p>
          </div>
          <div>
            <label className="panel-eyebrow block mb-1.5" htmlFor="monto">Monto (MXN)</label>
            <input id="monto" type="number" inputMode="numeric" value={monto}
              onChange={e => setMonto(e.target.value)} placeholder="2500"
              className="w-full sm:w-36 panel-cifra border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm px-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] placeholder:text-[rgba(22,54,42,0.35)]" />
          </div>
        </div>

        <div className="mb-4">
          <label className="panel-eyebrow block mb-1.5" htmlFor="detalle">
            Detalle que verá el cliente al pagar
          </label>
          <input id="detalle" value={detalle} onChange={e => setDetalle(e.target.value)}
            placeholder="Ignacio Ortiz · 4 personas · sale el 25 de octubre"
            className="w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm px-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] placeholder:text-[rgba(22,54,42,0.35)]" />
          <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-1.5">
            Se arma solo al elegir la cotización o la reserva. Puedes editarlo.
          </p>
        </div>

        {/* ── Cómo se verá la pantalla de pago ─────────────────────────────
            El cliente abre la liga días después de la conversación: aquí se
            comprueba que va a reconocer su viaje antes de mandarla. */}
        {(titulo.trim() || detalle.trim()) && (
          <div className="mb-4">
            <p className="panel-eyebrow mb-1.5">Así lo verá en Stripe</p>
            <div className="panel-card px-4 py-3.5 bg-[#FAFAF8]">
              <p className="font-dm text-sm text-[#16362a]">{titulo || "Sin concepto"}</p>
              {detalle.trim() && (
                <p className="font-dm text-[12px] text-[rgba(22,54,42,0.66)] mt-0.5">{detalle}</p>
              )}
              <p className="panel-cifra font-cormorant text-2xl font-light text-[#16362a] mt-2">
                MXN {Number(monto) > 0 ? Number(monto).toLocaleString("es-MX") : "0"}.00
              </p>
            </div>
          </div>
        )}

        {/* Cómo queda la reserva después de este cobro. Es la frase que evita
            mandar una liga por el total cuando el cliente ya dio el anticipo. */}
        {reserva && Number(monto) > 0 && (
          <div className={`mb-3 px-3.5 py-2.5 rounded-[7px] text-xs font-dm border ${
            Number(monto) > reserva.saldo
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-[#2b845c]/8 border-[#2b845c]/25 text-[#1B6B45]"
          }`}>
            {Number(monto) > reserva.saldo ? (
              <>
                Ojo: estás cobrando <strong>{fmx(Number(monto) - reserva.saldo)} más</strong> de lo que
                debe. Su saldo es {fmx(reserva.saldo)}.
              </>
            ) : Number(monto) === reserva.saldo ? (
              <>Con este pago la reserva <strong>{reserva.folio}</strong> queda saldada.</>
            ) : (
              <>
                Después de este pago, <strong>{reserva.folio}</strong> quedaría debiendo{" "}
                <strong>{fmx(reserva.saldo - Number(monto))}</strong>.
              </>
            )}
          </div>
        )}

        {error && <p className="text-[#b8413f] font-dm text-xs mb-3">{error}</p>}

        <button onClick={crear} disabled={creando || !titulo.trim() || !(Number(monto) >= 10)}
          className="flex items-center gap-2 bg-[#1B4332] hover:bg-[#16362a] text-white px-4 py-2.5 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco disabled:opacity-40">
          {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" strokeWidth={2} />}
          {creando ? "Creando la liga…" : "Crear liga de pago"}
        </button>

        {/* La liga recién creada, lista para mandar */}
        {reciente && (
          <div className="mt-4 border border-[#2b845c]/30 bg-[#2b845c]/8 rounded-[7px] p-4">
            <p className="font-dm text-xs text-[#1B6B45] mb-2">
              Liga lista para <strong>{reciente.titulo}</strong> por <strong>{fmx(reciente.monto)}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-[11px] font-mono bg-white border border-[rgba(27,67,50,0.12)] px-2.5 py-2 rounded-[7px]">
                {reciente.url}
              </code>
              <button onClick={() => copiar(reciente.url, "reciente")}
                className="flex items-center gap-1.5 panel-card px-3 py-2 text-[11px] font-dm text-[#16362a] panel-pulsable panel-foco">
                {copiado === "reciente" ? <Check className="w-3.5 h-3.5 text-[#2b845c]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado === "reciente" ? "Copiada" : "Copiar"}
              </button>
              <a href={mensajeWA(reciente)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-2 text-[11px] font-dm rounded-[7px] panel-pulsable panel-foco">
                <MessageCircle className="w-3.5 h-3.5" />Mandar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      {pagados.length > 0 && (
        <p className="font-dm text-xs text-[rgba(22,54,42,0.66)] mb-3">
          <strong className="text-[#2b845c]">{fmx(totalPagado)}</strong> cobrados con liga ·{" "}
          {activos.length} {activos.length === 1 ? "liga esperando" : "ligas esperando"} pago
        </p>
      )}

      {cargando ? (
        <div className="py-12 flex items-center justify-center gap-2 text-[rgba(22,54,42,0.51)] font-dm text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />Cargando…
        </div>
      ) : cobros.length === 0 ? (
        <div className="panel-card py-12 text-center">
          <Link2 className="w-5 h-5 text-[rgba(22,54,42,0.28)] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[rgba(22,54,42,0.51)] font-dm text-sm">
            Todavía no has creado ninguna liga de pago.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cobros.map(c => (
            <div key={c.id} className="panel-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[9px] font-dm px-2 py-0.5 rounded-sm ${
                      c.estado === "pagado"    ? "bg-[#2b845c]/15 text-[#1B6B45]"
                      : c.estado === "cancelado" ? "bg-[rgba(22,54,42,0.08)] text-[rgba(22,54,42,0.51)]"
                      : "bg-amber-100 text-amber-800"
                    }`}>
                      {c.estado === "pagado" ? "pagado" : c.estado === "cancelado" ? "cancelado" : "esperando pago"}
                    </span>
                    {c.folio && (
                      <span className="text-[10px] font-mono text-[rgba(22,54,42,0.51)]">{c.folio}</span>
                    )}
                  </div>
                  <p className="font-dm text-sm text-[#16362a] truncate">{c.titulo}</p>
                  <p className="font-dm text-[11px] text-[rgba(22,54,42,0.51)] mt-0.5">
                    {c.cliente ? `${c.cliente} · ` : ""}creada el {fFecha(c.createdAt)}
                    {c.creadoPor ? ` por ${c.creadoPor}` : ""}
                    {c.pagadoAt && ` · pagada el ${fFecha(c.pagadoAt)}`}
                    {c.correoDelPagador && ` · ${c.correoDelPagador}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`panel-cifra font-cormorant text-xl font-light ${
                    c.estado === "pagado" ? "text-[#2b845c]" : "text-[#16362a]"
                  }`}>
                    {fmx(c.montoPagado ?? c.monto)}
                  </span>
                  {c.estado === "activo" && (
                    <>
                      <button onClick={() => copiar(c.url, c.id)} title="Copiar la liga"
                        className="p-2 text-[rgba(22,54,42,0.51)] hover:text-[#16362a] hover:bg-[rgba(27,67,50,0.05)] rounded-[7px] panel-pulsable panel-foco">
                        {copiado === c.id ? <Check className="w-4 h-4 text-[#2b845c]" /> : <Copy className="w-4 h-4" strokeWidth={1.75} />}
                      </button>
                      <a href={mensajeWA(c)} target="_blank" rel="noopener noreferrer" title="Mandar por WhatsApp"
                        className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-[7px] panel-pulsable panel-foco">
                        <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
                      </a>
                      <button onClick={() => cancelar(c.id)} title="Cancelar este cobro"
                        className="p-2 text-[rgba(22,54,42,0.35)] hover:text-[#b8413f] hover:bg-[#b8413f]/8 rounded-[7px] panel-pulsable panel-foco">
                        <Ban className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                  {c.estado === "pagado" && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" title="Ver la liga"
                      className="p-2 text-[rgba(22,54,42,0.35)] hover:text-[#16362a] rounded-[7px] panel-foco">
                      <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
