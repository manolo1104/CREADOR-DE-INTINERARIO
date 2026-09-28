"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Download, Share2, X, Loader2, Check, ShieldCheck, AlertTriangle, Trash2, RotateCw } from "lucide-react";
import {
  OPCIONES_INICIALES, ponerMarca, fotoParaVista, pintarVista,
  aNombreDeArchivo, hoyEnMexico, esFotoLegible,
  type OpcionesMarca, type Posicion, type Tamano, type Giro,
} from "@/lib/admin/marcaAgua";
import { armarZip, crc32 } from "@/lib/admin/zip";

interface Foto {
  id: string;
  archivo: File;
  estado: "pendiente" | "procesando" | "lista" | "error";
  /** Con qué acomodo del logo y qué giro se hizo. Si alguno cambia, se rehace. */
  huella?: string;
  /** Cuánto la giró quien la revisa (la cámara a veces no anota que iba de lado). */
  giro?: Giro;
  /** La foto con el logo. En el teléfono se suelta en cuanto se guarda. */
  resultado?: Blob;
  crc?: number;
  /** Salió más chica que la original (solo en iPhone, con fotos de más de 16,7 MP). */
  reducida?: boolean;
  miniatura?: string;
  /** Ya se guardó o se mandó tal como está ahora. */
  guardada?: boolean;
}

const huellaDe = (o: OpcionesMarca, giro: Giro = 0) => `${o.posicion}|${o.tamano}|${o.conWeb ? 1 : 0}|${giro}`;
/** ¿La foto ya tiene el logo con el acomodo y el giro de ahora? */
const alDiaCon = (f: Foto, o: OpcionesMarca) => f.estado === "lista" && f.huella === huellaDe(o, f.giro);

/** Cuántas fotos se mandan de una vez al menú de compartir del teléfono. */
const POR_ENVIO = 25;
/**
 * Cuánto pesa como máximo cada ZIP.
 *
 * Las fotos salen a tamaño completo (8–12 MB cada una de una cámara de 24 MP):
 * cien fotos ya son un giga. Partido en ZIPs de ~800 MB, cada uno se descarga
 * y se abre sin que la computadora se atore.
 */
const LIMITE_ZIP = 800 * 1024 * 1024;
const CLAVE_OPCIONES = "fotos-marca:opciones";
/** La foto que se ve antes de elegir las del tour, para escoger el acomodo. */
const EJEMPLO = "/imagenes/tours/rzr-xilitla/hero.jpg";

// ── El motor vive fuera del componente ──────────────────────────────────────
// Así las fotos siguen ahí si alguien se va a Reservas y regresa, y el
// trabajo no se detiene a la mitad. Nada de esto sale del navegador: al
// cerrar o recargar la página, desaparece.
const motor = {
  fotos: [] as Foto[],
  opciones: null as OpcionesMarca | null,
  lote: "",
  oyente: null as ((f: Foto[]) => void) | null,
  corriendo: false,
  lienzo: null as HTMLCanvasElement | null,
  mini: null as HTMLCanvasElement | null,
  siguienteId: 0,
  avisoInstalado: false,
  /**
   * Cuántas fotos listas, sin guardar, puede haber en memoria a la vez.
   *
   * En computadora, todas. En el teléfono, una tanda: a tamaño completo, cien
   * fotos de cámara son un giga, y Safari cierra la página sin avisar mucho
   * antes de eso. Ahí se prepara una tanda, se guarda, se suelta y sigue la
   * siguiente.
   */
  limite: Infinity,
};

function actualizar(cambio: (prev: Foto[]) => Foto[]) {
  motor.fotos = cambio(motor.fotos);
  motor.oyente?.(motor.fotos);
}

const haySinGuardar = () => motor.fotos.some(f => f.estado !== "error" && !f.guardada);

/** Cerrar la pestaña con fotos sin guardar las pierde: el navegador pregunta antes. */
function instalarAviso() {
  if (motor.avisoInstalado) return;
  motor.avisoInstalado = true;
  window.addEventListener("beforeunload", e => {
    if (haySinGuardar()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

/** Pone el logo a las fotos que faltan, de una en una, hasta acabar. */
async function procesarCola() {
  if (motor.corriendo) return;
  motor.corriendo = true;
  motor.lienzo ??= document.createElement("canvas");
  motor.mini ??= document.createElement("canvas");
  try {
    for (;;) {
      const op = motor.opciones ?? OPCIONES_INICIALES;
      const sig = motor.fotos.find(f => f.estado !== "error" && !alDiaCon(f, op));
      if (!sig) break;
      const enEspera = motor.fotos.filter(f => alDiaCon(f, op) && f.resultado && !f.guardada).length;
      if (enEspera >= motor.limite) break;   // se sigue al guardar esta tanda
      // El giro y el acomodo se fijan aquí: si cambian mientras se hace, la
      // huella no coincidirá y la foto se vuelve a hacer.
      const giro = sig.giro ?? 0;
      const huella = huellaDe(op, giro);
      actualizar(prev => prev.map(f => (f.id === sig.id ? { ...f, estado: "procesando" } : f)));
      try {
        const r = await ponerMarca(sig.archivo, op, giro, motor.lienzo, motor.mini);
        const crc = crc32(new Uint8Array(await r.foto.arrayBuffer()));
        const mini = URL.createObjectURL(r.miniatura);
        let sigueAhi = false;
        actualizar(prev => prev.map(f => {
          if (f.id !== sig.id) return f;
          sigueAhi = true;
          if (f.miniatura) URL.revokeObjectURL(f.miniatura);
          return {
            ...f, estado: "lista", huella, resultado: r.foto, crc, miniatura: mini,
            reducida: r.reducida, guardada: false,
          };
        }));
        if (!sigueAhi) URL.revokeObjectURL(mini);   // la quitaron mientras se hacía
      } catch {
        actualizar(prev => prev.map(f => (f.id === sig.id ? { ...f, estado: "error", huella } : f)));
      }
      // Un respiro entre foto y foto para que la pantalla no se congele.
      await new Promise(r => setTimeout(r, 0));
    }
  } finally {
    motor.corriendo = false;
    // Soltar la memoria del lienzo grande: en iPhone es poca.
    if (motor.lienzo) { motor.lienzo.width = 1; motor.lienzo.height = 1; }
  }
}

// ── Formato ─────────────────────────────────────────────────────────────────
const mb = (bytes: number) => {
  const v = bytes / 1024 / 1024;
  return v >= 1000 ? `${(v / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(v))} MB`;
};
const fotosTxt = (n: number) => `${n} ${n === 1 ? "foto" : "fotos"}`;

// ── Pantalla ────────────────────────────────────────────────────────────────
export default function FotosClient() {
  const [fotos, setFotos] = useState<Foto[]>(motor.fotos);
  const [opciones, setOpciones] = useState<OpcionesMarca>(motor.opciones ?? OPCIONES_INICIALES);
  const [lote, setLote] = useState(motor.lote);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  /** Teléfono con menú de compartir: ahí se guarda en Fotos o se manda por WhatsApp. */
  const [esTelefono, setEsTelefono] = useState(false);

  useEffect(() => {
    motor.oyente = setFotos;
    setFotos(motor.fotos);
    // El acomodo se recuerda de un día para otro: casi siempre es el mismo.
    if (!motor.opciones) {
      let guardadas: OpcionesMarca = OPCIONES_INICIALES;
      try {
        const raw = localStorage.getItem(CLAVE_OPCIONES);
        if (raw) guardadas = { ...OPCIONES_INICIALES, ...JSON.parse(raw) };
      } catch { /* sin almacenamiento: se usa el acomodo de siempre */ }
      motor.opciones = guardadas;
      setOpciones(guardadas);
    }
    let telefono = false;
    try {
      const archivoPrueba = new File([new Blob()], "prueba.jpg", { type: "image/jpeg" });
      const tactil = window.matchMedia("(pointer: coarse)").matches;
      telefono = tactil && !!navigator.canShare?.({ files: [archivoPrueba] });
    } catch { /* sin menú de compartir: se trabaja como en computadora */ }
    setEsTelefono(telefono);
    motor.limite = telefono ? POR_ENVIO : Infinity;
    procesarCola();
    return () => { motor.oyente = null; };
  }, []);

  function cambiarOpciones(parcial: Partial<OpcionesMarca>) {
    const nuevas = { ...opciones, ...parcial };
    setOpciones(nuevas);
    motor.opciones = nuevas;
    try { localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(nuevas)); } catch { /* no pasa nada */ }
    procesarCola();
  }

  function cambiarLote(v: string) { setLote(v); motor.lote = v; }

  function agregar(lista: FileList | File[] | null) {
    if (!lista || lista.length === 0) return;
    instalarAviso();
    const todos = Array.from(lista);
    const legibles = todos.filter(esFotoLegible);
    // Por nombre y peso, sin la fecha del archivo: según el teléfono, la misma
    // foto elegida dos veces puede traer otra fecha y colarse repetida.
    const clave = (a: File) => `${a.name}|${a.size}`;
    const ya = new Set(motor.fotos.map(f => clave(f.archivo)));
    const nuevas: Foto[] = [];
    for (const a of legibles) {
      if (ya.has(clave(a))) continue;
      ya.add(clave(a));
      nuevas.push({ id: `f${++motor.siguienteId}`, archivo: a, estado: "pendiente" });
    }
    // En el orden en que se tomaron: la cámara las numera (DSC_0001, DSC_0002…).
    actualizar(prev => [...prev, ...nuevas].sort((x, y) =>
      x.archivo.name.localeCompare(y.archivo.name, "es", { numeric: true })));

    const saltadas = todos.length - legibles.length;
    const repetidas = legibles.length - nuevas.length;
    const partes: string[] = [];
    if (saltadas > 0) partes.push(saltadas === 1
      ? "Se saltó 1 archivo que no es JPG ni PNG (seguramente un RAW: la cámara guarda cada foto dos veces y aquí basta con el JPG)."
      : `Se saltaron ${saltadas} archivos que no son JPG ni PNG (seguramente RAW: la cámara guarda cada foto dos veces y aquí basta con el JPG).`);
    if (repetidas > 0) partes.push(repetidas === 1
      ? "1 foto ya estaba y no se repitió."
      : `${repetidas} fotos ya estaban y no se repitieron.`);
    setAviso(partes.length ? partes.join(" ") : null);
    setConfirmarBorrar(false);
    procesarCola();
  }

  /**
   * Gira la foto un cuarto de vuelta a la derecha.
   *
   * Hay cámaras que no anotan que se tomó de lado y la foto llega acostada.
   * Se rehace con el giro (el logo siempre queda derecho, abajo) y, si ya se
   * había guardado, vuelve a quedar pendiente: la guardada es la acostada.
   */
  function girar(id: string) {
    actualizar(prev => prev.map(f => (f.id === id
      ? { ...f, giro: (((f.giro ?? 0) + 90) % 360) as Giro, guardada: false }
      : f)));
    setSeleccion(id);
    procesarCola();
  }

  function quitar(id: string) {
    actualizar(prev => prev.filter(f => {
      if (f.id !== id) return true;
      if (f.miniatura) URL.revokeObjectURL(f.miniatura);
      return false;
    }));
    if (seleccion === id) setSeleccion(null);
  }

  function borrarTodo() {
    actualizar(prev => {
      prev.forEach(f => f.miniatura && URL.revokeObjectURL(f.miniatura));
      return [];
    });
    setSeleccion(null);
    setAviso(null);
    setConfirmarBorrar(false);
  }

  // ── Estado del trabajo ────────────────────────────────────────────────────
  const validas = fotos.filter(f => f.estado !== "error");
  const conError = fotos.length - validas.length;
  /** Ya tienen el logo con el acomodo de ahora (guardadas o no). */
  const alDia = validas.filter(f => alDiaCon(f, opciones));
  const porProcesar = validas.length - alDia.length;
  const trabajando = porProcesar > 0;
  /** Listas y en memoria, esperando a que alguien las guarde. */
  const enEspera = alDia.filter(f => f.resultado && !f.guardada);
  const guardadas = alDia.filter(f => f.guardada).length;
  const porGuardar = validas.length - guardadas;
  const hayReducidas = alDia.some(f => f.reducida);
  // En el teléfono se manda por tandas: se puede en cuanto la tanda está
  // completa, o cuando ya no queda nada por preparar.
  const tandaObjetivo = Math.min(POR_ENVIO, enEspera.length + porProcesar);
  const tandaLista = enEspera.length > 0 && enEspera.length >= tandaObjetivo;

  const prefijo = `${aNombreDeArchivo(lote) || "huasteca-tours"}-${hoyEnMexico()}`;
  const nombreDe = (i: number) => `${prefijo}-${String(i + 1).padStart(3, "0")}.jpg`;
  /** El número de cada foto es su lugar en la lista: igual en el ZIP y en el teléfono. */
  const numeroDe = (f: Foto) => validas.indexOf(f);

  /** Los ZIP, partidos por peso. */
  const partesZip: { desde: number; hasta: number; peso: number }[] = [];
  for (let i = 0; i < alDia.length; i++) {
    const peso = alDia[i].resultado?.size ?? 0;
    const ultima = partesZip[partesZip.length - 1];
    if (!ultima || ultima.peso + peso > LIMITE_ZIP) partesZip.push({ desde: i, hasta: i + 1, peso });
    else { ultima.hasta = i + 1; ultima.peso += peso; }
  }
  const pesoTotal = partesZip.reduce((s, p) => s + p.peso, 0);

  function descargarZip(desde: number, hasta: number, parte: number | null) {
    const trozo = alDia.slice(desde, hasta).filter(f => f.resultado);
    const zip = armarZip(trozo.map(f => ({ nombre: nombreDe(numeroDe(f)), datos: f.resultado!, crc: f.crc! })));
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefijo}${parte ? `-parte-${parte}` : ""}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // El navegador lee el archivo al guardarlo; después se suelta la memoria.
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    const s = new Set(trozo.map(f => f.id));
    actualizar(prev => prev.map(f => (s.has(f.id) ? { ...f, guardada: true } : f)));
  }

  /**
   * Abre el menú de compartir del teléfono con la tanda que está lista.
   *
   * Desde ahí se eligen "Guardar imágenes" (van directo a Fotos) o WhatsApp
   * (al grupo del tour, sin guardarlas antes). Al terminar, esas fotos se
   * sueltan de la memoria y se prepara la tanda siguiente.
   */
  async function compartirTanda() {
    if (enEspera.length === 0) {
      // Ya se guardaron todas: se rehacen para poder mandarlas otra vez.
      actualizar(prev => prev.map(f => (f.estado === "error" ? f : { ...f, huella: undefined, guardada: false })));
      procesarCola();
      return;
    }
    const tanda = enEspera.slice(0, POR_ENVIO);
    const files = tanda.map(f => new File([f.resultado!], nombreDe(numeroDe(f)), { type: "image/jpeg" }));
    try {
      await navigator.share({ files });
      const s = new Set(tanda.map(f => f.id));
      actualizar(prev => prev.map(f => (s.has(f.id) ? { ...f, guardada: true, resultado: undefined } : f)));
      setAviso(null);
      procesarCola();
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setAviso("El teléfono no abrió el menú para guardar. Vuelve a tocar el botón; si sigue sin abrir, hazlo desde la computadora.");
      }
    }
  }

  // ── Vista previa ──────────────────────────────────────────────────────────
  const vistaRef = useRef<HTMLCanvasElement>(null);
  const baseVista = useRef<{ clave: string; lienzo: HTMLCanvasElement } | null>(null);
  const fotoVista = validas.find(f => f.id === seleccion) ?? validas[0] ?? null;
  const claveVista = fotoVista?.id ?? "ejemplo";
  const archivoVista = fotoVista?.archivo ?? null;
  const giroVista = fotoVista?.giro ?? 0;
  const [vistaLista, setVistaLista] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        if (baseVista.current?.clave !== claveVista) {
          setVistaLista(false);
          const fuente = archivoVista ?? await (await fetch(EJEMPLO)).blob();
          const lienzo = await fotoParaVista(fuente);
          if (cancelado) return;
          baseVista.current = { clave: claveVista, lienzo };
        }
        if (cancelado || !vistaRef.current || !baseVista.current) return;
        pintarVista(vistaRef.current, baseVista.current.lienzo, opciones, giroVista);
        if (!cancelado) setVistaLista(true);
      } catch {
        if (!cancelado) setVistaLista(false);
      }
    })();
    return () => { cancelado = true; };
  }, [claveVista, archivoVista, opciones, giroVista]);

  const numeroVista = fotoVista ? validas.indexOf(fotoVista) + 1 : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`px-5 sm:px-7 py-6 max-w-[1100px] mx-auto ${validas.length > 0 ? "pb-44 sm:pb-28" : ""}`}>
      <h1 className="font-cormorant text-[#16362a] text-[28px] leading-none font-light mb-1">Fotos</h1>
      <p className="text-[rgba(22,54,42,0.66)] font-dm text-sm mb-2 max-w-[640px]">
        Elige las fotos del tour: a cada una se le pone el logo de Huasteca y quedan listas para
        guardar en este dispositivo o mandar a los viajeros.
      </p>
      <p className="flex items-start gap-1.5 text-[12px] font-dm text-[#2b845c] mb-6 max-w-[640px]">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-px" strokeWidth={1.75} />
        No se suben a internet ni se guardan en la plataforma: todo pasa aquí mismo y se borran al cerrar la página.
      </p>

      {/* ── Elegir fotos ─────────────────────────────────────────────────── */}
      <label
        htmlFor="fotos-input"
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={e => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files); }}
        className={`panel-card panel-card-alta flex flex-col sm:flex-row items-center gap-4 px-5 py-6 mb-6 cursor-pointer border-dashed transition-colors ${
          arrastrando ? "!border-[#1B4332] bg-[#1B4332]/[0.04]" : "hover:border-[rgba(27,67,50,0.35)]"
        }`}
      >
        <span className="w-12 h-12 rounded-full bg-[#1B4332]/[0.07] flex items-center justify-center flex-shrink-0">
          <ImagePlus className="w-6 h-6 text-[#1B4332]" strokeWidth={1.6} />
        </span>
        <span className="flex-1 text-center sm:text-left">
          <span className="block font-dm text-[15px] text-[#16362a] font-medium">
            {fotos.length ? "Agregar más fotos" : "Elige las fotos del tour"}
          </span>
          <span className="block font-dm text-[12px] text-[rgba(22,54,42,0.60)] mt-0.5">
            {esTelefono ? "Toca para elegirlas de tu galería." : "Arrástralas aquí o haz clic para elegirlas."} Todas las que quieras, en JPG o PNG.
          </span>
        </span>
        <span className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-[7px] bg-[#1B4332] text-white text-sm font-dm panel-pulsable">
          Elegir fotos
        </span>
        <input
          id="fotos-input" type="file" multiple
          accept="image/*,.heic,.heif"
          className="sr-only"
          onChange={e => { agregar(e.target.files); e.target.value = ""; }}
        />
      </label>

      {aviso && (
        <div className="flex items-start gap-2 text-[12px] font-dm text-[#a86814] bg-[#a86814]/[0.07] border border-[#a86814]/20 rounded-[7px] px-3 py-2.5 mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" strokeWidth={1.75} />
          <span className="flex-1">{aviso}</span>
          <button onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="panel-foco rounded p-0.5 -m-0.5">
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Cómo va a quedar ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 mb-6">
        <div className="panel-card overflow-hidden">
          <div className="relative bg-[#0e1710] flex items-center justify-center min-h-[220px]">
            <canvas ref={vistaRef}
              className={`block w-full h-auto max-h-[62vh] object-contain transition-opacity duration-200 ${vistaLista ? "opacity-100" : "opacity-0"}`} />
            {!vistaLista && (
              <Loader2 className="absolute w-6 h-6 text-white/60 animate-spin" strokeWidth={1.75} />
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-2">
            <p className="flex-1 text-[12px] font-dm text-[rgba(22,54,42,0.60)]">
              {fotoVista
                ? <>Así va a quedar · foto <span className="panel-cifra">{numeroVista}</span> de <span className="panel-cifra">{validas.length}</span>. Toca otra abajo para verla aquí.</>
                : "Foto de ejemplo. Escoge dónde va el logo antes de elegir las del tour; se recuerda para la próxima."}
            </p>
            {fotoVista && (
              <button onClick={() => girar(fotoVista.id)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-[7px] border border-[rgba(27,67,50,0.15)] bg-white text-[#16362a] text-[13px] font-dm panel-pulsable panel-foco hover:border-[rgba(27,67,50,0.35)]">
                <RotateCw className="w-4 h-4" strokeWidth={1.9} />
                Girar
              </button>
            )}
          </div>
        </div>

        <div className="panel-card p-4 space-y-5 self-start">
          <fieldset>
            <legend className="panel-eyebrow mb-2">¿Dónde va el logo?</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ["izquierda", "Esquina izquierda"],
                ["centro",    "Abajo al centro"],
                ["derecha",   "Esquina derecha"],
              ] as [Posicion, string][]).map(([id, label]) => {
                const activo = opciones.posicion === id;
                return (
                  <button key={id} onClick={() => cambiarOpciones({ posicion: id })} aria-pressed={activo}
                    className={`flex flex-col items-center gap-1.5 px-1.5 py-2.5 min-h-[44px] rounded-[7px] border text-[11px] font-dm leading-tight panel-pulsable panel-foco ${
                      activo
                        ? "bg-[#1B4332] text-white border-[#1B4332]"
                        : "bg-white border-[rgba(27,67,50,0.15)] text-[rgba(22,54,42,0.66)] hover:border-[rgba(27,67,50,0.35)]"
                    }`}>
                    {/* Un rectángulo que es la foto y una rayita que es el logo. */}
                    <span aria-hidden className={`relative w-9 h-6 rounded-[3px] border ${activo ? "border-white/70" : "border-[rgba(22,54,42,0.35)]"}`}>
                      <span className={`absolute bottom-[3px] h-[3px] w-3 rounded-full ${activo ? "bg-white" : "bg-[rgba(22,54,42,0.55)]"} ${
                        id === "centro" ? "left-1/2 -translate-x-1/2" : id === "derecha" ? "right-[3px]" : "left-[3px]"
                      }`} />
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="panel-eyebrow mb-2">Tamaño</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {([["chico", "Chico"], ["mediano", "Mediano"], ["grande", "Grande"]] as [Tamano, string][]).map(([id, label]) => {
                const activo = opciones.tamano === id;
                return (
                  <button key={id} onClick={() => cambiarOpciones({ tamano: id })} aria-pressed={activo}
                    className={`min-h-[44px] rounded-[7px] border text-[13px] font-dm panel-pulsable panel-foco ${
                      activo
                        ? "bg-[#1B4332] text-white border-[#1B4332]"
                        : "bg-white border-[rgba(27,67,50,0.15)] text-[rgba(22,54,42,0.66)] hover:border-[rgba(27,67,50,0.35)]"
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-2.5 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={opciones.conWeb}
              onChange={e => cambiarOpciones({ conWeb: e.target.checked })}
              className="mt-0.5 w-[18px] h-[18px] accent-[#1B4332] flex-shrink-0" />
            <span className="font-dm text-[13px] text-[#16362a] leading-snug">
              Poner la página web bajo el logo
              <span className="block text-[11px] text-[rgba(22,54,42,0.60)] mt-0.5">
                Quien vea la foto en el WhatsApp o el Instagram de un amigo sabe dónde buscarlos.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="lote" className="panel-eyebrow block mb-1.5">¿De qué salida son? (opcional)</label>
            <input id="lote" value={lote} onChange={e => cambiarLote(e.target.value)}
              placeholder="Tamul, familia Ortiz"
              className="w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-[16px] sm:text-sm font-dm px-3 py-2.5 rounded-[7px] focus:outline-none focus:border-[#1B4332] placeholder:text-[rgba(22,54,42,0.35)]" />
            <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-1.5">
              Así se llamarán:
              <span className="block truncate text-[rgba(22,54,42,0.66)]" title={nombreDe(0)}>{nombreDe(0)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Las fotos ────────────────────────────────────────────────────── */}
      {fotos.length > 0 && (
        <div className="panel-card p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
            <h2 className="font-cormorant text-[#16362a] text-lg font-light">
              <span className="panel-cifra">{fotosTxt(validas.length)}</span>
            </h2>
            <p className="text-[12px] font-dm text-[rgba(22,54,42,0.60)]" aria-live="polite">
              {porGuardar === 0
                ? <span className="text-[#2b845c]">Todas guardadas</span>
                : esTelefono
                  ? trabajando && !tandaLista
                    ? <>Preparando <span className="panel-cifra">{enEspera.length}</span> de <span className="panel-cifra">{tandaObjetivo}</span>…</>
                    : <><span className="panel-cifra">{guardadas}</span> de <span className="panel-cifra">{validas.length}</span> guardadas</>
                  : trabajando
                    ? <>Poniendo el logo… <span className="panel-cifra">{alDia.length}</span> de <span className="panel-cifra">{validas.length}</span></>
                    : <>Listas · <span className="panel-cifra">{porGuardar}</span> sin guardar todavía</>}
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-[rgba(27,67,50,0.08)] overflow-hidden mb-4">
            <div className="h-full bg-[#2b845c] transition-[width] duration-300"
              style={{ width: `${validas.length ? Math.round(((esTelefono ? guardadas : alDia.length) / validas.length) * 100) : 0}%` }} />
          </div>

          {hayReducidas && (
            <p className="text-[12px] font-dm text-[rgba(22,54,42,0.66)] mb-3">
              El iPhone no deja trabajar fotos de más de 16 megapíxeles, así que las más grandes salen a 16 MP.
              Para el tamaño original exacto, hazlo desde la computadora.
            </p>
          )}

          {conError > 0 && (
            <p className="text-[12px] font-dm text-[#a86814] mb-3">
              {fotosTxt(conError)} no se {conError === 1 ? "pudo" : "pudieron"} abrir en este navegador (suele pasar con fotos HEIC en computadora). Están marcadas en rojo y no se van a guardar.
            </p>
          )}

          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {fotos.map(f => {
              const n = validas.indexOf(f) + 1;
              const hecha = alDiaCon(f, opciones);
              const esVista = fotoVista?.id === f.id;
              return (
                <li key={f.id} className="relative group">
                  <button
                    onClick={() => f.estado !== "error" && setSeleccion(f.id)}
                    aria-label={f.estado === "error" ? `${f.archivo.name}: no se pudo abrir` : `Ver la foto ${n}`}
                    className={`block w-full aspect-[4/3] rounded-[6px] overflow-hidden bg-[rgba(27,67,50,0.07)] panel-foco ${
                      esVista ? "ring-2 ring-[#1B4332] ring-offset-2" : ""
                    } ${f.estado === "error" ? "ring-1 ring-[#b3261e]/40 cursor-default" : ""}`}>
                    {f.miniatura && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.miniatura} alt="" loading="lazy"
                        className={`w-full h-full object-cover transition-opacity ${hecha ? "" : "opacity-45"}`} />
                    )}
                    {f.estado === "error" && (
                      <span className="absolute inset-0 flex items-center justify-center px-1.5 text-center text-[10px] font-dm text-[#b3261e] leading-tight">
                        No se pudo abrir
                      </span>
                    )}
                    {!hecha && f.estado !== "error" && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className={`w-4 h-4 text-[#1B4332] ${f.estado === "procesando" ? "animate-spin" : "opacity-40"}`} strokeWidth={2} />
                      </span>
                    )}
                  </button>
                  {f.estado !== "error" && (
                    <span className="absolute left-1 top-1 px-1 rounded-[4px] bg-black/55 text-white text-[10px] font-dm panel-cifra pointer-events-none">
                      {n}
                    </span>
                  )}
                  {hecha && f.guardada && (
                    <span className="absolute left-1 bottom-1 w-4 h-4 rounded-full bg-[#2b845c] flex items-center justify-center pointer-events-none" title="Ya guardada">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  {f.estado !== "error" && (
                    <button onClick={() => girar(f.id)} aria-label={`Girar la foto ${n}`}
                      className="absolute -right-1.5 -bottom-1.5 w-7 h-7 rounded-full bg-white shadow ring-1 ring-[rgba(27,67,50,0.15)] flex items-center justify-center text-[rgba(22,54,42,0.66)] hover:text-[#1B4332] panel-foco sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity">
                      <RotateCw className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </button>
                  )}
                  <button onClick={() => quitar(f.id)} aria-label={`Quitar ${f.archivo.name}`}
                    className="absolute -right-1.5 -top-1.5 w-7 h-7 rounded-full bg-white shadow ring-1 ring-[rgba(27,67,50,0.15)] flex items-center justify-center text-[rgba(22,54,42,0.66)] hover:text-[#b3261e] panel-foco sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5" strokeWidth={2.25} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Guardar ──────────────────────────────────────────────────────────
          Fija abajo y no `sticky`: el <main> del panel tiene overflow propio,
          y dentro de él un sticky nunca se despega. Con cien fotos en la
          rejilla, el botón de guardar tiene que estar a la mano sin bajar. */}
      {validas.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[232px] z-30 panel-glass border-t border-[rgba(27,67,50,0.10)]">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-7 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {confirmarBorrar ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <p className="flex-1 text-[13px] font-dm text-[#16362a]">
                {porGuardar > 0
                  ? <>Hay <strong className="panel-cifra">{fotosTxt(porGuardar)}</strong> sin guardar. Si las borras de aquí, se pierden.</>
                  : "Ya se guardaron todas. ¿Las borro de esta pantalla para empezar otra salida?"}
              </p>
              <div className="flex gap-2">
                <button onClick={borrarTodo}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-[7px] bg-[#b3261e] text-white text-sm font-dm panel-pulsable panel-foco">
                  Sí, borrar
                </button>
                <button onClick={() => setConfirmarBorrar(false)}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-[7px] border border-[rgba(27,67,50,0.15)] bg-white text-[#16362a] text-sm font-dm panel-pulsable panel-foco">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {esTelefono ? (
                <button onClick={compartirTanda}
                  disabled={!tandaLista && porGuardar > 0}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-[7px] bg-[#1B4332] text-white text-[15px] font-dm font-medium panel-pulsable panel-foco disabled:opacity-50">
                  {!tandaLista && porGuardar > 0
                    ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                    : <Share2 className="w-4 h-4" strokeWidth={2} />}
                  {tandaLista
                    ? `Guardar o mandar ${fotosTxt(enEspera.length)}`
                    : porGuardar > 0
                      ? `Preparando ${enEspera.length} de ${tandaObjetivo}…`
                      : "Mandarlas otra vez"}
                </button>
              ) : partesZip.length <= 1 ? (
                <button onClick={() => descargarZip(0, alDia.length, null)} disabled={trabajando || alDia.length === 0}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-[7px] bg-[#1B4332] text-white text-sm font-dm font-medium panel-pulsable panel-foco disabled:opacity-50">
                  {trabajando ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <Download className="w-4 h-4" strokeWidth={2} />}
                  {trabajando
                    ? `Poniendo el logo… ${alDia.length} de ${validas.length}`
                    : `Descargar en ZIP · ${fotosTxt(alDia.length)}, ${mb(pesoTotal)}`}
                </button>
              ) : (
                // Varios ZIP: a tamaño completo, cien fotos ya pasan de un giga.
                partesZip.map((p, i) => {
                  const hecha = alDia.slice(p.desde, p.hasta).every(f => f.guardada);
                  return (
                    <button key={i} onClick={() => descargarZip(p.desde, p.hasta, i + 1)} disabled={trabajando}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[7px] border border-[rgba(27,67,50,0.15)] bg-white text-[#16362a] text-sm font-dm panel-pulsable panel-foco disabled:opacity-50">
                      {hecha ? <Check className="w-4 h-4 text-[#2b845c]" strokeWidth={2.25} /> : <Download className="w-4 h-4" strokeWidth={2} />}
                      ZIP {i + 1} · fotos {p.desde + 1}–{p.hasta} · {mb(p.peso)}
                    </button>
                  );
                })
              )}

              <button onClick={() => setConfirmarBorrar(true)}
                className="sm:ml-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-[7px] text-[13px] font-dm text-[rgba(22,54,42,0.66)] hover:text-[#b3261e] panel-pulsable panel-foco">
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                Terminar y borrar de aquí
              </button>
            </div>
          )}
          {esTelefono && !confirmarBorrar && (
            <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-2">
              Van de {POR_ENVIO} en {POR_ENVIO}. Elige «Guardar imágenes» para tu galería, o WhatsApp para el grupo del tour.
            </p>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
