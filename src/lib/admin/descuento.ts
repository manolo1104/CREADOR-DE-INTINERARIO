/**
 * El descuento de una cotización o de una reserva, guardado COMO descuento
 * (Manolo, 20 oct 2026: «si se pone un descuento, asegúralo… que no se mueva si
 * se edita o se pasa a reserva, que quede registrado con un segurito»).
 *
 * 🔴 Antes la reserva no tenía descuento: guardaba el total ya rebajado y, al
 * editarla, lo leía como «total editado». En cuanto alguien tocaba un tour, un
 * cuarto o un extra, ese total se borraba y el cliente perdía su descuento sin
 * que nadie se diera cuenta. Ahora el descuento vive en el `_meta` (tipo y
 * valor), se vuelve a aplicar sobre el precio nuevo y cada cambio deja rastro.
 *
 * El rastro lo escribe el SERVIDOR (`sellarDescuento`): quién y cuándo lo puso,
 * lo cambió o lo quitó. La pantalla manda solo el tipo y el valor; lo demás lo
 * copia el servidor de lo que ya estaba guardado, así no se puede borrar ni
 * inventar desde el navegador.
 *
 * Los campos viejos (`discountType` / `discountValue`) se siguen escribiendo:
 * los leen el PDF y el correo de la cotización (`totalesCotizacion.ts`).
 */

export type TipoDescuento = "percent" | "fixed";

export interface Descuento {
  tipo:  TipoDescuento;
  /** 10 (%) o 500 ($). */
  valor: number;
  /** Quién lo puso o lo cambió por última vez, y cuándo (ISO). Lo sella el servidor. */
  por?:  string;
  en?:   string;
}

export interface EventoDescuento {
  accion: "puso" | "cambió" | "quitó";
  /** «10 %» / «$500»; null si no había. */
  antes:  string | null;
  ahora:  string | null;
  por:    string;
  en:     string;
}

type Meta = Record<string, unknown>;

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

/** El descuento guardado: el nuevo (`descuento`) o, en lo viejo, `discountType`/`discountValue`. */
export function descuentoDeMeta(meta: Meta | null | undefined): Descuento | null {
  if (!meta) return null;
  if ("descuento" in meta) {
    const d = meta.descuento as Partial<Descuento> | null;
    if (!d || entero(d.valor) <= 0) return null;
    return {
      tipo:  d.tipo === "fixed" ? "fixed" : "percent",
      valor: entero(d.valor),
      ...(typeof d.por === "string" ? { por: d.por } : {}),
      ...(typeof d.en === "string" ? { en: d.en } : {}),
    };
  }
  if (meta.discountValue != null && entero(meta.discountValue) > 0) {
    return { tipo: meta.discountType === "fixed" ? "fixed" : "percent", valor: entero(meta.discountValue) };
  }
  return null;
}

export function historialDeMeta(meta: Meta | null | undefined): EventoDescuento[] {
  const h = meta?.descuentoHistorial;
  return Array.isArray(h) ? (h.filter((e) => e && typeof e === "object") as EventoDescuento[]) : [];
}

/** Cuánto se descuenta, en pesos, sobre `base`. Nunca más que `base`. */
export function montoDescuento(d: Pick<Descuento, "tipo" | "valor"> | null | undefined, base: number): number {
  if (!d || d.valor <= 0 || base <= 0) return 0;
  const m = d.tipo === "fixed" ? d.valor : Math.round(base * (d.valor / 100));
  return Math.max(0, Math.min(m, base));
}

/** «10 %» · «$500». */
export function textoDescuento(d: Pick<Descuento, "tipo" | "valor"> | null | undefined): string | null {
  if (!d || d.valor <= 0) return null;
  return d.tipo === "fixed" ? `$${d.valor.toLocaleString("es-MX")}` : `${d.valor} %`;
}

export function mismoDescuento(a: Descuento | null, b: Descuento | null): boolean {
  if (!a || !b) return !a && !b;
  return a.tipo === b.tipo && a.valor === b.valor;
}

/**
 * Lo que el servidor guarda en el `_meta` al crear o editar: compara con lo
 * que ya estaba (`metaAntes`; null al crear) y, si el descuento cambió, lo
 * sella con `quien` y la hora y suma el cambio al historial. Si no cambió, deja
 * el sello y el historial de antes, aunque el navegador mande otra cosa.
 *
 * Al crear con un descuento que ya trae sello (una cotización que se pasa a
 * reserva), se respetan su sello y su historial: es el mismo descuento.
 */
export function sellarDescuento(
  metaNuevo: Meta,
  metaAntes: Meta | null,
  quien: string,
  ahora: Date = new Date(),
): { meta: Meta; evento: EventoDescuento | null } {
  const nuevo = descuentoDeMeta(metaNuevo);
  const en    = ahora.toISOString();

  let descuento: Descuento | null;
  let historial: EventoDescuento[];
  let evento: EventoDescuento | null = null;

  if (metaAntes) {
    const antes = descuentoDeMeta(metaAntes);
    historial = historialDeMeta(metaAntes);
    // 🔴 Solo los formularios de Cotización y Reserva hablan del descuento.
    // Otras pantallas guardan el `_meta` (hospedaje, cobros…) sin él: eso NO
    // es quitarlo, es no decir nada, y se queda el de antes.
    const dijo = "descuento" in metaNuevo || "discountValue" in metaNuevo;
    if (!dijo || mismoDescuento(antes, nuevo)) {
      descuento = antes;
    } else {
      evento = {
        accion: !antes ? "puso" : nuevo ? "cambió" : "quitó",
        antes:  textoDescuento(antes),
        ahora:  textoDescuento(nuevo),
        por:    quien,
        en,
      };
      descuento = nuevo ? { tipo: nuevo.tipo, valor: nuevo.valor, por: quien, en } : null;
      historial = [...historial, evento];
    }
  } else {
    historial = historialDeMeta(metaNuevo);
    if (nuevo && !nuevo.por) {
      evento = { accion: "puso", antes: null, ahora: textoDescuento(nuevo), por: quien, en };
      descuento = { tipo: nuevo.tipo, valor: nuevo.valor, por: quien, en };
      historial = [...historial, evento];
    } else {
      descuento = nuevo;
    }
  }

  // Sin descuento ni historial no se escribe nada nuevo en el `_meta`.
  if (!descuento && historial.length === 0 && !("descuento" in metaNuevo)) return { meta: metaNuevo, evento };
  return {
    meta: {
      ...metaNuevo,
      descuento,
      descuentoHistorial: historial,
      discountType:  descuento ? descuento.tipo : (metaNuevo.discountType ?? null),
      // Si se quitó a propósito, se quita también el campo viejo (lo leen el PDF y el detalle).
      discountValue: descuento ? descuento.valor : ("descuento" in metaNuevo ? null : (metaNuevo.discountValue ?? null)),
    },
    evento,
  };
}

/**
 * Aplica `sellarDescuento` al `_meta: true` de una lista: el de `lineItems` en
 * las reservas y el de `packageItems` en las cotizaciones (el de precio). Solo
 * `_meta === true`: el viejo `_meta: "cotizado"` era un hotel. Sin `_meta`, no
 * toca nada.
 */
export function sellarEnLineItems(
  lineItems: unknown,
  lineItemsAntes: unknown,
  quien: string,
): { lineItems: unknown; evento: EventoDescuento | null } {
  if (!Array.isArray(lineItems)) return { lineItems, evento: null };
  const esMeta = (l: unknown) => !!l && typeof l === "object" && (l as Meta)._meta === true;
  const i = lineItems.findIndex(esMeta);
  if (i < 0) return { lineItems, evento: null };
  const antes = Array.isArray(lineItemsAntes)
    ? ((lineItemsAntes as unknown[]).find(esMeta) as Meta | undefined) ?? {}
    : null;
  const { meta, evento } = sellarDescuento(lineItems[i] as Meta, antes, quien);
  const copia = [...lineItems];
  copia[i] = meta;
  return { lineItems: copia, evento };
}

/** «Manolo cambió el descuento de 10 % a 5 %» para la bitácora. */
export function resumenEvento(e: EventoDescuento): string {
  if (e.accion === "puso")  return `${e.por} puso un descuento de ${e.ahora}`;
  if (e.accion === "quitó") return `${e.por} quitó el descuento de ${e.antes}`;
  return `${e.por} cambió el descuento de ${e.antes} a ${e.ahora}`;
}
