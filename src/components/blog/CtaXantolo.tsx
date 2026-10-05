import Link from "next/link";
import { BedDouble, Car, Sun, Moon, ArrowRight } from "lucide-react";
import { TOURS_DB, regresoDeTour, etiquetaUnidad, type Tour } from "@/lib/tours";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { getPaquete, eventoALaVenta, precioVisible, nochesXantoloALaVenta } from "@/lib/paquetes";
import { lugaresDePaqueteSeguro } from "@/lib/cupoPaquete";
import { cabeEnCupo } from "@/lib/cupoEvento";
import { NOCHE_XANTOLO } from "@/lib/nocheXantolo";
import { PatronXantolo } from "@/components/blog/PatronXantolo";

/**
 * Las salidas a la venta del artículo de Xantolo.
 *
 * Por qué existen (1 oct 2026): la guía de Xantolo es la página más visitada
 * del sitio —29 % de las sesiones en Clarity— y vendía casi nada. El 84 % se
 * iba sin abrir otra página, la mitad de los lectores en celular no pasaba del
 * 40 % del artículo, y la primera salida a un tour estaba a la mitad. Además el
 * texto repetía «nuestros recorridos no incluyen el Xantolo».
 *
 * Lo que se promete aquí es SOLO lo que ya existe. Las comparsas son gratis y
 * en la plaza de cada pueblo: no se venden. Desde el 2 oct 2026 hay producto
 * propio, el paquete Xantolo (`/paquetes/xantolo-2026`, la noche del 1 de
 * noviembre con hotel; desde el 4 oct, para parejas o familias): mientras se
 * vende, el bloque de arriba lo anuncia con los cuartos REALES. Desde el 4 oct
 * también la Noche de Xantolo sin hotel (`/paquetes/noche-de-xantolo`, $990 por
 * persona, 31 oct y 1 nov): sale junto al paquete y, si el paquete se agota, en
 * su lugar. Sin nada a la venta, vuelve a lo de antes (armar el viaje por
 * WhatsApp).
 *
 * Colores del popup de Xantolo (`PopupXantolo.tsx`): morado de altar y
 * cempasúchil, fuera de la paleta verde del sitio a propósito.
 */

const MORADO = "#2a1231";
const CEMPASUCHIL = "#f29422";

/** Último día en que tiene sentido anunciar las fechas (horario de México). */
const ULTIMO_DIA = "2026-11-02";

/** ¿Seguimos antes de que termine el Xantolo 2026? La página es dinámica. */
export function xantoloVigente(): boolean {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return hoy <= ULTIMO_DIA;
}

/** ¿Este artículo es de Xantolo? */
export function esArticuloXantolo(slug: string): boolean {
  return /xantolo/.test(slug);
}

const WA_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
  </svg>
);

const PAQUETE = "xantolo-2026";

/** El botón verde de WhatsApp. Lo cuenta solo `WhatsAppClickTracker`. */
function BotonWhatsApp({ texto }: { texto: string }) {
  return (
    <a
      href={waLink(WA_MESSAGES.xantolo)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 bg-[#25D366] px-5 py-3.5 font-dm text-[11px] font-medium uppercase tracking-[1.5px] text-white transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
    >
      {WA_SVG}
      {texto}
    </a>
  );
}

/**
 * Arriba del artículo, tras el índice: la única salida que ve casi todo el que
 * entra (en Clarity, el 77 % de los lectores en celular pasa del 15 % de la
 * página y solo el 27 % llega a la mitad).
 */
export async function XantoloPlanDeViaje() {
  if (!xantoloVigente()) return null;

  // ¿Queda alguna noche sin hotel con lugar? Se anuncia junto al paquete o,
  // si el paquete se acabó, en su lugar.
  const noches = nochesXantoloALaVenta();
  const lugaresNoches = await Promise.all(noches.map((n) => lugaresDePaqueteSeguro(n)));
  const hayNoche = noches.some((_, i) => !lugaresNoches[i] || cabeEnCupo(lugaresNoches[i]!, 1));

  // El paquete, mientras se vende y le quepa al menos una pareja.
  const paquete = getPaquete(PAQUETE);
  if (paquete?.evento && eventoALaVenta(paquete)) {
    const lugares = await lugaresDePaqueteSeguro(paquete);
    if (!lugares || cabeEnCupo(lugares, 2)) {
      return <XantoloPaquete precio={precioVisible(paquete)} libres={lugares?.libres ?? null} cupo={paquete.evento.cupo} pagina={paquete.evento.pagina} conNoche={hayNoche} />;
    }
  }
  if (hayNoche) return <XantoloNoche />;

  const filas = [
    { Icon: BedDouble, texto: "Hospedaje en Xilitla para las noches de fiesta" },
    { Icon: Car,       texto: "Traslado desde San Luis Potosí, Tampico o CDMX" },
    { Icon: Sun,       texto: "Recorridos de día que regresan antes del anochecer" },
  ];
  return (
    <aside
      aria-labelledby="xantolo-plan-titulo"
      id="xantolo-plan"
      className="not-prose relative isolate my-10 scroll-mt-28 overflow-hidden"
      style={{ backgroundColor: MORADO, border: `1px solid ${CEMPASUCHIL}40` }}
    >
      {/* Iconos de temporada de fondo, tenues (ver `PatronXantolo`). */}
      <PatronXantolo />
      <div className="relative p-6 sm:p-8">
        <p className="font-dm text-[10px] uppercase tracking-[2.5px]" style={{ color: CEMPASUCHIL }}>
          ✦ Xantolo 2026 · 31 oct al 2 nov
        </p>
        <h2 id="xantolo-plan-titulo" className="mt-3 font-cormorant text-[28px] font-light leading-[1.1] text-crema sm:text-[34px]">
          Las comparsas son gratis.
          <br />
          <span style={{ color: CEMPASUCHIL }}>El resto del viaje, te lo armamos.</span>
        </h2>
        <ul className="mt-5 space-y-2.5">
          {filas.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 font-dm text-[14px] leading-snug text-crema/80">
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: CEMPASUCHIL }} aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <BotonWhatsApp texto="Armar mi viaje de Xantolo" />
          <Link
            href="/paquetes"
            className="inline-flex items-center justify-center gap-2 border border-crema/25 px-5 py-3.5 font-dm text-[11px] uppercase tracking-[1.5px] text-crema/80 transition-colors hover:border-crema/60 hover:text-crema"
          >
            Paquetes con hotel <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-3 font-dm text-[11px] leading-snug text-crema/50">
          Cuéntanos cuántos son y cuántas noches tienen: te mandamos un plan para tus fechas.
        </p>
      </div>
    </aside>
  );
}

/**
 * El anuncio del paquete, en el mismo lugar y con la misma piel que el bloque
 * de armar el viaje. El precio y los lugares salen del motor y de la base.
 */
function XantoloPaquete({ precio, libres, cupo, pagina, conNoche }: { precio: number; libres: number | null; cupo: number; pagina: string; conNoche: boolean }) {
  const filas = [
    { Icon: BedDouble, texto: "Una noche con hotel en Xilitla, del domingo 1 al lunes 2 de noviembre, para parejas o familias" },
    { Icon: Sun,       texto: "Ruta Surrealista de día, con transporte desde el hotel" },
    { Icon: Moon,      texto: "Degustación de temporada y la noche de Xantolo con guía" },
  ];
  return (
    <aside
      aria-labelledby="xantolo-plan-titulo"
      id="xantolo-plan"
      className="not-prose relative isolate my-10 scroll-mt-28 overflow-hidden"
      style={{ backgroundColor: MORADO, border: `1px solid ${CEMPASUCHIL}40` }}
    >
      {/* Iconos de temporada de fondo, tenues (ver `PatronXantolo`). */}
      <PatronXantolo />
      <div className="relative p-6 sm:p-8">
        <p className="font-dm text-[10px] uppercase tracking-[2.5px]" style={{ color: CEMPASUCHIL }}>
          ✦ Paquete Xantolo · domingo 1 de noviembre
        </p>
        {/* Cifras «lining»: con las antiguas de Cormorant el «1» se lee «ı». */}
        <h2 id="xantolo-plan-titulo" className="mt-3 font-cormorant text-[28px] font-light leading-[1.1] text-crema sm:text-[34px]" style={{ fontVariantNumeric: "lining-nums", fontFeatureSettings: '"lnum" 1' }}>
          Las comparsas son gratis.
          <br />
          <span style={{ color: CEMPASUCHIL }}>La noche del 1 de noviembre, te la armamos.</span>
        </h2>
        <ul className="mt-5 space-y-2.5">
          {filas.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 font-dm text-[14px] leading-snug text-crema/80">
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: CEMPASUCHIL }} aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 font-dm text-[14px] text-crema/85" style={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
          <strong className="font-medium text-crema">${precio.toLocaleString("es-MX")}</strong> la pareja
          {libres !== null && <span style={{ color: CEMPASUCHIL }}> · quedan {libres} de {cupo} cuartos</span>}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={pagina}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 font-dm text-[11px] font-medium uppercase tracking-[1.5px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: CEMPASUCHIL, color: "#1a0c1f" }}
          >
            Ver el paquete <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <BotonWhatsApp texto="Armar otro plan" />
        </div>
        {/* Para quien ya tiene hospedaje o llega el sábado: la noche sola. */}
        {conNoche && (
          <p className="mt-4 font-dm text-[13px] text-crema/70" style={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
            ¿Ya tienes hospedaje o llegas el sábado?{" "}
            <Link href={NOCHE_XANTOLO.pagina} className="underline underline-offset-4 hover:text-crema" style={{ color: CEMPASUCHIL }}>
              Solo la noche, ${NOCHE_XANTOLO.precioAdulto.toLocaleString("es-MX")} por persona
            </Link>
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * La noche sin hotel, cuando el paquete ya no tiene cuartos (o no se vende).
 * Misma piel y mismo lugar que el anuncio del paquete.
 */
function XantoloNoche() {
  const filas = [
    { Icon: Car,  texto: `Pasamos por ti a ${NOCHE_XANTOLO.recogida}, ${NOCHE_XANTOLO.horario}` },
    { Icon: Sun,  texto: `Degustación de temporada: ${NOCHE_XANTOLO.degustacion}` },
    { Icon: Moon, texto: `Con un guía del pueblo, ${NOCHE_XANTOLO.queVes}` },
  ];
  return (
    <aside
      aria-labelledby="xantolo-plan-titulo"
      id="xantolo-plan"
      className="not-prose relative isolate my-10 scroll-mt-28 overflow-hidden"
      style={{ backgroundColor: MORADO, border: `1px solid ${CEMPASUCHIL}40` }}
    >
      <PatronXantolo />
      <div className="relative p-6 sm:p-8">
        <p className="font-dm text-[10px] uppercase tracking-[2.5px]" style={{ color: CEMPASUCHIL }}>
          ✦ Noche de Xantolo · sábado 31 o domingo 1
        </p>
        <h2 id="xantolo-plan-titulo" className="mt-3 font-cormorant text-[28px] font-light leading-[1.1] text-crema sm:text-[34px]" style={{ fontVariantNumeric: "lining-nums", fontFeatureSettings: '"lnum" 1' }}>
          Las comparsas son gratis.
          <br />
          <span style={{ color: CEMPASUCHIL }}>Te llevamos con guía.</span>
        </h2>
        <ul className="mt-5 space-y-2.5">
          {filas.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 font-dm text-[14px] leading-snug text-crema/80">
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: CEMPASUCHIL }} aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 font-dm text-[14px] text-crema/85" style={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
          <strong className="font-medium text-crema">${NOCHE_XANTOLO.precioAdulto.toLocaleString("es-MX")}</strong> por persona · niños con descuento
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={NOCHE_XANTOLO.pagina}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 font-dm text-[11px] font-medium uppercase tracking-[1.5px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: CEMPASUCHIL, color: "#1a0c1f" }}
          >
            Ver las noches <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <BotonWhatsApp texto="Armar otro plan" />
        </div>
      </div>
    </aside>
  );
}

// ── De día, cascadas; de noche, Xantolo ─────────────────────────────────────

/** Los que regresan con luz: caben en un día de fiesta. Orden = recomendación. */
const DE_DIA = ["ruta-surrealista-edward-james", "olla-de-la-luz", "travesia-del-cafe"];
/** Los que regresan de noche: mejor el día antes o el día después. */
const DIA_COMPLETO = ["expedicion-tamul", "cascadas-del-meco", "ruta-acuatica-puente-de-dios"];

const tours = (slugs: string[]): Tour[] =>
  slugs.map((s) => TOURS_DB.find((t) => t.slug === s)).filter((t): t is Tour => !!t);

function FilaTour({ t }: { t: Tour }) {
  return (
    <li>
      <Link
        href={`/tours/${t.slug}`}
        className="group flex items-baseline justify-between gap-4 border-b border-white/10 py-3 transition-colors hover:border-white/30"
      >
        <span className="min-w-0">
          <span className="block font-dm text-[14px] text-crema/90 group-hover:text-crema">{t.nombreCorto}</span>
          <span className="mt-0.5 block font-dm text-[12px] font-light text-crema/50">
            Regresas {regresoDeTour(t, false)}
          </span>
        </span>
        <span className="whitespace-nowrap font-dm text-[13px]" style={{ color: CEMPASUCHIL }}>
          ${t.precio.toLocaleString("es-MX")} <span className="text-[10px] text-crema/45">{etiquetaUnidad(t)}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * A mitad del artículo, en lugar de la tarjeta de un solo tour: qué recorrido
 * cabe en un día de Xantolo y cuál conviene dejar para antes o después. Los
 * horarios de regreso salen del catálogo (`regresoDeTour`), no se escriben aquí.
 */
export function XantoloDiasYNoches() {
  if (!xantoloVigente()) return null;
  const paq = getPaquete(PAQUETE);
  const conPaquete = paq?.evento && eventoALaVenta(paq) ? paq.evento.pagina : null;
  const conNoche = nochesXantoloALaVenta().length > 0;
  const deDia = tours(DE_DIA);
  const completos = tours(DIA_COMPLETO);
  if (!deDia.length) return null;
  return (
    <section
      aria-labelledby="xantolo-dias-titulo"
      className="not-prose my-12"
      style={{ backgroundColor: MORADO, border: `1px solid ${CEMPASUCHIL}40` }}
    >
      <div className="p-6 sm:p-8">
        {/* Cada mitad en un bloque que no se parte: en un teléfono la frase
            entera no cabe y, sin esto, cada mitad se doblaba en dos renglones. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-dm text-[10px] uppercase tracking-[2.5px]" style={{ color: CEMPASUCHIL }}>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Sun className="h-3.5 w-3.5" aria-hidden="true" /> De día, cascadas
          </span>
          <span className="text-crema/30" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Moon className="h-3.5 w-3.5" aria-hidden="true" /> de noche, Xantolo
          </span>
        </p>
        <h2 id="xantolo-dias-titulo" className="mt-3 font-cormorant text-[26px] font-light leading-tight text-crema sm:text-[30px]">
          Qué hacer de día sin perderte las comparsas
        </h2>
        <p className="mt-2 font-dm text-[13px] leading-relaxed text-crema/60">
          Estos regresan con tiempo para la fiesta de la noche:
        </p>
        <ul className="mt-2">
          {deDia.map((t) => <FilaTour key={t.slug} t={t} />)}
        </ul>
        {completos.length > 0 && (
          <>
            <p className="mt-6 font-dm text-[13px] leading-relaxed text-crema/60">
              Estos llenan el día completo: van mejor el 30 de octubre o el 3 de noviembre.
            </p>
            <ul className="mt-2">
              {completos.map((t) => <FilaTour key={t.slug} t={t} />)}
            </ul>
          </>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <BotonWhatsApp texto="¿Cuál me conviene? Pregúntanos" />
          {conPaquete && (
            <Link href={conPaquete} className="font-dm text-[13px] underline underline-offset-4 hover:text-crema" style={{ color: CEMPASUCHIL }}>
              O todo armado: el paquete del 1 de noviembre
            </Link>
          )}
          {conNoche && (
            <Link href={NOCHE_XANTOLO.pagina} className="font-dm text-[13px] underline underline-offset-4 hover:text-crema" style={{ color: CEMPASUCHIL }}>
              O solo la noche con guía
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
