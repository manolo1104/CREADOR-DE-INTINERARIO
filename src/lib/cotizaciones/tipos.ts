// Tipos del módulo de cotizaciones del SERVIDOR: lo que arma el bot de
// WhatsApp, lo que se guarda en `TourQuote` y lo que devuelve la confirmación
// de un pago.
//
// 🔴 Los renglones (`LineItem`, `PackageItem`) son los del panel y llegan con
// `import type`: `ReservaModal.tsx` es "use client" y de ahí SOLO pueden salir
// tipos. Una constante o una función importada de un archivo de cliente llega
// rota al servidor y ni el build ni tsc avisan.

import type { LineItem, PackageItem, LineaAddOn } from "@/components/admin/ReservaModal";
import type { ExtraItem } from "@/lib/admin/extras";
import type { MetodoCobro } from "@/lib/admin/metodosCobro";
import type { Actor } from "@/lib/admin/bitacora";

export type { LineItem, PackageItem, LineaAddOn };

export type LocaleBot = "es" | "en";

// ── Lo que manda el bot ─────────────────────────────────────────────────────

/** Un recorrido cobrado por persona (o por grupo, como el Edén). */
export interface ItemTourBot {
  tipo:        "tour";
  slug:        string;
  /** YYYY-MM-DD, hora de México. Decide la promo de temporada baja. */
  tourDate:    string;
  adultos:     number;
  /** 6 a 10 años: pagan el 70 %. */
  ninosMid?:   number;
  /** Menores de 6: pagan el 50 %. */
  ninosSmall?: number;
  /** Actividades opcionales: del bot SOLO se acepta el id y la cantidad. */
  addOns?:     { id: string; cantidad: number }[];
}

/** Un recorrido cobrado por vehículo (el RZR). */
export interface ItemRzrBot {
  tipo:       "rzr";
  /** Si falta, el recorrido por vehículo del catálogo. */
  slug?:      string;
  tourDate:   string;
  /** Se aceptan nombres aproximados («nanacatli», «defender familiar»). */
  ruta:       string;
  vehiculo:   string;
  /** Si falta, las que hagan falta para `personas` (mínimo 1). */
  unidades?:  number;
  personas?:  number;
  /** Hora de inicio "HH:MM" que elige el cliente, de 09:00 a 17:00. */
  hora?:      string;
}

export type ItemCotizacionBot = ItemTourBot | ItemRzrBot;

/**
 * El renglón tal como viaja en el contrato del bot (`ItemBot`), sin `tipo`.
 * Se acepta también: el tipo se deduce del catálogo (un recorrido por vehículo
 * es RZR) o de que traiga ruta y vehículo.
 */
export interface ItemBotCrudo {
  tipo?:       string;
  slug?:       string;
  tourDate?:   string;
  adultos?:    number;
  ninosMid?:   number;
  ninosSmall?: number;
  addOns?:     { id: string; cantidad: number }[];
  ruta?:       string;
  vehiculo?:   string;
  unidades?:   number;
  personas?:   number;
  hora?:       string;
}

export type ItemEntradaBot = ItemCotizacionBot | ItemBotCrudo;

/** Un paquete del catálogo (o de evento, como el Xantolo). */
export interface PaqueteCotizacionBot {
  slug:          string;
  /** Día 1 del paquete (YYYY-MM-DD). En un paquete de evento manda la fecha del evento. */
  fecha:         string;
  adultos:       number;
  ninosMid?:     number;
  ninosSmall?:   number;
  vistaMontana?: boolean;
  /** Llega la víspera: una noche más, check-in el día anterior. */
  nocheExtra?:   boolean;
  /** Los recorridos que eligió, cuando el paquete deja elegir. */
  eleccion?:     string[];
  /** Cuánta gente duerme en cada habitación (ej. [3, 2]). */
  reparto?:      number[];
  /** El cuarto que pidió, si pidió uno. Opcional: si no, el del paquete. */
  habitacion?:   string;
}

/** Hotel Paraíso Encantado a la medida (noches sueltas junto a los recorridos). */
export interface HospedajeCotizacionBot {
  habitacion:    string;
  checkin:       string;
  /** Manda sobre `noches` si vienen los dos. */
  checkout?:     string;
  noches?:       number;
  /** Si falta, las mínimas para que quepan todos. */
  habitaciones?: number;
  /** Cuántas personas duermen en TOTAL: se reparten entre las habitaciones. */
  huespedes:     number;
}

export interface ClienteCotizacionBot {
  /** Como quiere que aparezca en la cotización. */
  nombre:    string;
  correo?:   string;
  /** Teléfono REAL en dígitos (52XXXXXXXXXX). Nunca derivado de un `@lid`. */
  telefono?: string;
  /** El id del chat tal cual ("…@c.us" o "…@lid"). */
  waChatId?: string;
}

export interface CotizacionBotInput {
  items:          ItemEntradaBot[];
  paquete?:       PaqueteCotizacionBot;
  hospedaje?:     HospedajeCotizacionBot;
  cliente:        ClienteCotizacionBot;
  locale?:        LocaleBot;
  /** "Xilitla" | "Ciudad Valles" | texto libre. Decide la recogida. */
  zonaHospedaje?: string;
  /** Solo para el equipo: nunca sale al cliente. */
  notasInternas?: string;
  /** Lo único que va a la columna `notes`, que SÍ ve el cliente (correo y PDF). */
  notasCliente?:  string;
  /**
   * El folio (COT-… o HP-P…) de la cotización que ésta REEMPLAZA: el cliente
   * cambió el tour, la fecha, la gente o el hotel. Lo calcula el código del
   * bot y no el modelo (tras el recorte del historial el modelo ya no ve el
   * folio viejo). Se procesa DESPUÉS de guardar y mandar la nueva
   * (`reemplazarCotizacion`): si algo falla, el cliente nunca se queda sin una
   * cotización que valga.
   */
  reemplazaA?:    string;
  /** true = es una opción más para comparar: NO se reemplaza nada aunque venga `reemplazaA`. */
  aparte?:        boolean;
}

/**
 * Lo que pasó con la cotización anterior: va como `reemplazo` en la respuesta
 * de las rutas que cotizan cuando el bot mandó `reemplazaA`. Con `ok: false`
 * la anterior sigue como estaba y la nueva igual quedó. `pagoEnCurso`: no se
 * tocó porque YA está pagada (tiene reserva o está aceptada): el bot no le
 * pide otro pago y pasa el cambio al equipo. `folio` es la que de verdad se
 * reemplazó (siguiendo la cadena puede ser la que reemplazó a la pedida).
 */
export type ResultadoReemplazo =
  | { folio: string; ok: true }
  | { folio: string; ok: false; motivo: string; pagoEnCurso?: true; reservaFolio?: string };

/** Lo que pregunta `/api/bot/precio`: lo mismo, sin cliente ni reemplazo. No se guarda nada. */
export type PrecioBotInput = Omit<CotizacionBotInput, "cliente" | "items" | "reemplazaA" | "aparte"> & {
  items?:   ItemEntradaBot[];
  cliente?: ClienteCotizacionBot;
};

// ── Lo que se calcula ───────────────────────────────────────────────────────

export interface PromoLinea {
  /** ¿Este recorrido, en ESTA fecha, lleva la promo de temporada baja? */
  aplica:       boolean;
  /** Precio por persona de lista. */
  precioLista?: number;
  /** Precio por persona con la promo (solo si aplica). */
  precioPromo?: number;
  /** Último día de RECORRIDO con la promo (YYYY-MM-DD). */
  vence?:       string;
}

/** Un recorrido cotizado, para que el bot lo diga. */
export interface LineaPrecio {
  slug:            string;
  nombre:          string;
  tourDate:        string;
  cobro:           "persona" | "grupo" | "vehiculo";
  personas:        number;
  adultos:         number;
  ninosMid:        number;
  ninosSmall:      number;
  /** Lo que se cobra por este recorrido (la cuenta de la web). */
  total:           number;
  /** Precio por adulto en esa fecha (solo cobro por persona). */
  porPersona?:     number;
  promo:           PromoLinea;
  /** Va UNA persona: paga el precio de dos menos $2 y se suma a un grupo armado. */
  viajeroSolo?:    boolean;
  ruta?:           string;
  vehiculo?:       string;
  unidades?:       number;
  /** Personas que caben en UNA unidad (RZR). */
  capacidad?:      number;
  /** La capacidad como la dice el catálogo: "6 adultos + 2 niños". */
  capacidadTexto?: string;
  /** RZR: hora de inicio elegida ("HH:MM"). */
  hora?:           string;
  addOns?:         LineaAddOn[];
  /** Lo que hay que decir o confirmar (edad, «para mañana»…). NO impide cotizar. */
  avisos?:         string[];
}

/** Lo que no se pudo cotizar. `indice` = posición en `items`; −1 = paquete, hospedaje o cliente. */
export interface ErrorPrecio {
  indice: number;
  slug:   string;
  motivo: string;
}

/** Un grupo de habitaciones con la misma ocupación. */
export interface FilaHospedaje {
  habitaciones:   number;
  /** Personas en CADA una de estas habitaciones. */
  huespedes:      number;
  /** Por habitación y por noche. */
  precioPorNoche: number;
  subtotal:       number;
}

export interface HospedajePrecio {
  habitacion:     string;
  hotel:          string;
  checkin:        string;
  checkout:       string;
  noches:         number;
  habitaciones:   number;
  huespedes:      number;
  /**
   * 🔴 Lo que cuestan TODAS las habitaciones UNA noche: `subtotal = precioPorNoche × noches`.
   * Con ocupaciones distintas (5 personas = 3 + 2) no hay un solo precio por
   * cuarto; el de cada uno va en `desglose`.
   */
  precioPorNoche: number;
  subtotal:       number;
  desglose:       FilaHospedaje[];
  avisos?:        string[];
}

export interface PaquetePrecio {
  slug:          string;
  nombre:        string;
  total:         number;
  personas:      number;
  adultos:       number;
  ninosMid:      number;
  ninosSmall:    number;
  /** Día 1 del paquete. */
  fecha:         string;
  /** Sin hotel (la Noche de Xantolo) van vacíos y en 0. */
  checkin:       string;
  checkout:      string;
  noches:        number;
  habitacion?:   string;
  habitaciones:  number;
  nocheExtra:    boolean;
  /** De fecha fija y cupo (Xantolo): no se elige el día. */
  evento:        boolean;
  promo:         PromoLinea;
  avisos?:       string[];
}

/** El renglón de tour que se guarda: el del panel más lo que el panel no captura. */
export type LineaGuardada = LineItem & {
  /** Va UNA persona con la tarifa de viajero solo: el correo lo explica. */
  viajeroSolo?: boolean;
  /** RZR: hora de inicio que eligió el cliente. */
  hora?:        string;
};

/**
 * El `_meta` de `packageItems` de una cotización del bot. Los campos del panel
 * (anticipo… notasInternas) los lee y los reescribe el editor; los del bot
 * (origen, waChatId…) el editor los conserva al guardar.
 */
export interface MetaCotizacionBot {
  _meta:          true;
  /** IMPORTE del anticipo: lo leen el PDF, el correo y la reserva. */
  anticipo:       number;
  anticipoTipo:   "percent";
  anticipoValor:  number;
  vigencia:       "48h";
  numPersonas:    number | null;
  /** El total del bot cuando es MAYOR que la suma a precio de lista del panel (viajero solo). */
  priceOverride:  number | null;
  /** Cuando la web cobra MENOS que la suma de lista (promo, Edén, paquete): la diferencia, fija. */
  discountType:   "fixed" | null;
  discountValue:  number | null;
  notasInternas:  string;
  origen:         "bot";
  waChatId:       string | null;
  waTelefono:     string | null;
  zonaHospedaje:  string | null;
  locale:         LocaleBot;
  /** Paquete del catálogo o de evento: la reserva se guarda con este slug (cupo). */
  paqueteSlug?:   string;
  /** Se escriben al convertirla en reserva. */
  reservaFolio?:  string;
  reservaId?:     string;
  /** Se escribe al reemplazarla (`reemplazarCotizacion`): el folio de la cotización nueva. */
  reemplazadaPor?: string;
}

/** Lo que se escribe en `TourQuote`, ya con la forma del panel. */
export interface FilaTourQuoteBot {
  tourName:     string;
  tourSlug:     string;
  tourDate:     string;
  adults:       number;
  children:     number;
  totalAmount:  number;
  lineItems:    LineaGuardada[];
  /** `[_meta, ...habitaciones]`: el `_meta` SIEMPRE va primero. */
  packageItems: (MetaCotizacionBot | PackageItem)[];
  extraItems:   ExtraItem[];
}

export interface CotizacionCalculada {
  lineas:       LineaPrecio[];
  hospedaje?:   HospedajePrecio;
  paquete?:     PaquetePrecio;
  total:        number;
  /** El 30 % con el MISMO redondeo que `desgloseCotizacion`. */
  anticipo:     number;
  saldo:        number;
  pctAnticipo:  number;
  errores:      ErrorPrecio[];
  /** No quedó nada que cobrar: `guardarCotizacionBot` no guarda. */
  vacia:        boolean;
  /** Tamaño del grupo (el mayor de los renglones; nunca la suma). */
  numPersonas:  number | null;
  /** Lo que suman los renglones como los calcula el panel (precio de lista). */
  sumaPanel:    number;
  priceOverride: number | null;
  /** Lo que se guardaría en `TourQuote`. */
  guardar:      FilaTourQuoteBot;
}

/** La respuesta de `/api/bot/precio`. */
export interface RespuestaPrecioBot {
  ok:          true;
  lineas:      LineaPrecio[];
  hospedaje?:  HospedajePrecio;
  paquete?:    PaquetePrecio;
  total:       number;
  anticipo:    number;
  saldo:       number;
  pctAnticipo: number;
  errores:     ErrorPrecio[];
}

// ── Envío ───────────────────────────────────────────────────────────────────

export interface ResultadoEnvio {
  ok:            boolean;
  /** ¿Salió un correo AL CLIENTE? (sin correo del cliente va solo al equipo). */
  emailEnviado:  boolean;
  /** Fecha límite (YYYY-MM-DD) que quedó guardada. */
  venceEl:       string | null;
  /** A quién: el correo, o el teléfono / chat si fue por WhatsApp. */
  destinatario:  string | null;
  /** Correo: el estado con que nació el seguimiento (activo | sin-tiempo). */
  seguimiento?:  string;
  /** Estado de la cotización después de anotar el envío. */
  status?:       string;
  /** Los `lineItems` ya guardados (la ruta del panel los devuelve). */
  lineItems?:    unknown;
  error?:        string;
}

export interface ResultadoCorreoReserva {
  ok:            boolean;
  emailEnviado:  boolean;
  destinatario:  string | null;
  /** "sin-correo": la reserva no tiene un correo válido (la ruta del panel responde 400). */
  motivo?:       "sin-correo" | "error";
  error?:        string;
}

// ── Confirmación de un pago ─────────────────────────────────────────────────

export interface ComprobanteBot {
  base64:    string;
  mimetype?: string;
  filename?: string;
}

export interface ConfirmarPagoInput {
  /** COT-…, HP-P… (cotización) o HP-M-…/HP… (reserva). */
  folio:          string;
  /** Lo que de verdad llegó. Sin monto: el anticipo acordado. */
  monto?:         number | null;
  /** Id de `metodosCobro.ts` (o «oxxo», «spei», «liga»…). Por omisión, transferencia. */
  metodo?:        string | null;
  comprobante?:   ComprobanteBot | null;
  /** Quién vio el dinero ("Manolo"): va en la nota del cobro. */
  confirmadoPor?: string | null;
  /**
   * El dueño ya revisó lo que se frena con 409 y confirma igual: el mismo pago
   * hace minutos, otra reserva del mismo cliente, cotización vencida o evento
   * sin lugar. Nunca se salta los montos que no cuadran (400).
   */
  forzar?:        boolean;
  /** Por omisión, BOT. */
  actor?:         Actor;
}

export interface RecorridoConfirmado {
  nombre:    string;
  fecha:     string;
  /** Hora de salida, o «te la confirmamos un día antes». */
  salida?:   string;
  /** Dónde y cómo se recoge, del catálogo. */
  recogida?: string;
  queLlevar: string[];
}

export interface ConfirmacionResultado {
  /** El folio que se pidió confirmar. */
  folio:               string;
  reservaFolio:        string;
  status:              string;
  tourName:            string;
  tourDate:            string;
  adults:              number;
  children:            number;
  customerName:        string;
  customerPhone:       string | null;
  waChatId?:           string;
  totalAmount:         number;
  pagado:              number;
  saldo:               number;
  liquidado:           boolean;
  pctPagado:           number;
  salida?:             string;
  recogida?:           string;
  recorridos:          RecorridoConfirmado[];
  /** Lleva hotel (paquete o noches): el saldo se paga al hacer check-in. */
  esPaquete:           boolean;
  /** Hay que pedirle el hospedaje exacto para la recogida. */
  pideHospedaje:       boolean;
  /** El pago ya estaba registrado: esta llamada no movió dinero. */
  yaConfirmada:        boolean;
  locale:              LocaleBot;
  /** Lo que se registró en ESTA llamada (0 si nada). */
  cobroRegistrado:     number;
  metodo:              MetodoCobro;
  reservaNueva:        boolean;
  emailEnviado:        boolean;
  comprobanteGuardado: boolean;
  /** Para quien confirmó: lo que no impidió el cobro pero hay que saber. */
  avisos:              string[];
}
