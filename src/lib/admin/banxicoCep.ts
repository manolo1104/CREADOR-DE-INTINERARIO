/**
 * Verificar una transferencia SPEI con el CEP de Banxico (12 nov 2026).
 *
 * Manolo: «¿se puede conectar mi banco Inbursa para que Erick verifique desde
 * el panel los pagos?». Inbursa no da API a un negocio de este tamaño, y los
 * agregadores piden las claves del banco. Lo que SÍ existe y es público es el
 * Comprobante Electrónico de Pago (CEP) de Banxico: con la fecha, la clave de
 * rastreo, el banco que envía, el banco y la cuenta que reciben y el monto,
 * Banxico dice si ese SPEI se liquidó. Es la misma consulta que cualquiera hace
 * a mano en https://www.banxico.org.mx/cep/.
 *
 * 🔴 Lo que hay que saber:
 *  · Solo SPEI entre bancos DISTINTOS. Una transferencia de Inbursa a Inbursa,
 *    un depósito en ventanilla o en OXXO NO generan CEP: esos los da por vistos
 *    Manolo o Martín en la cuenta («manual»).
 *  · Banxico atiende la consulta de 09:30 a 23:00, todos los días.
 *  · No hay API oficial: se usa el mismo formulario que la página. El 12 nov
 *    2026 su captcha estaba escondido (valor fijo «c»); si Banxico lo activa,
 *    la consulta deja de funcionar y el panel lo dice y manda a la página.
 *  · Banxico solo encuentra el pago si TODOS los datos cuadran (fecha, clave,
 *    banco, cuenta y monto). «No encontrada» no siempre es fraude: casi
 *    siempre es un dato mal copiado del comprobante.
 *  · Probado el 12 nov 2026 con una consulta inventada («Operación no
 *    encontrada»). La respuesta de un pago REAL no se ha visto todavía: por eso
 *    solo se da por verificado si Banxico dice «liquidad…» y lo demás queda
 *    «no concluyente», con su texto a la vista para que una persona decida.
 */

const BASE = "https://www.banxico.org.mx/cep";
const UA = "Mozilla/5.0 (panel Huasteca Potosina Tours)";

export type EstadoCep = "verificado" | "no_encontrado" | "no_concluyente" | "fuera_de_horario" | "datos_invalidos" | "sin_servicio";

export interface ConsultaCep {
  /** YYYY-MM-DD: el día en que se hizo la transferencia. */
  fecha: string;
  claveRastreo: string;
  /** Código Banxico del banco que envía (40012 = BBVA). */
  emisor: string;
  /** Código Banxico del banco que recibe (40036 = Inbursa). */
  receptor: string;
  /** CLABE de la cuenta que recibe. */
  cuenta: string;
  /** En pesos. */
  monto: number;
}

export interface ResultadoCep {
  estado: EstadoCep;
  /** Para la persona que verifica, en español llano. */
  mensaje: string;
  /** El texto de Banxico, limpio y corto, para guardarlo y revisarlo. */
  textoBanxico?: string;
}

/** Lo que el formulario de Banxico espera: fecha DD-MM-YYYY y monto con dos decimales. */
export function formularioCep(c: ConsultaCep): Record<string, string> {
  const [y, m, d] = c.fecha.split("-");
  return {
    tipoCriterio: "T", // T = clave de rastreo; R = número de referencia
    fecha: `${d}-${m}-${y}`,
    criterio: c.claveRastreo.trim().toUpperCase(),
    emisor: c.emisor,
    receptor: c.receptor,
    cuenta: c.cuenta.replace(/\D/g, ""),
    receptorParticipante: "0", // 0 = el dinero va a la cuenta de un cliente del banco, no al banco
    monto: (Math.round(c.monto * 100) / 100).toFixed(2),
    captcha: "c",
    tipoConsulta: "0", // 0 = consultar (no descargar el PDF)
  };
}

/** Errores de captura que se detectan antes de molestar a Banxico. */
export function validarConsulta(c: ConsultaCep): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) return "Falta la fecha de la transferencia.";
  const clave = c.claveRastreo.trim();
  // Banxico pide de 7 a 30 caracteres; la página deja letras, números y algunos signos.
  if (clave.length < 7 || clave.length > 30 || !/^[A-Za-z0-9\-_.\/ ]+$/.test(clave)) {
    return "La clave de rastreo tiene de 7 a 30 letras o números (viene en el comprobante).";
  }
  if (!/^\d{3,5}$/.test(c.emisor)) return "Elige el banco desde el que transfirió el cliente.";
  if (c.emisor === c.receptor) {
    return "De Inbursa a Inbursa no hay comprobante de Banxico: esa la tiene que ver Manolo o Martín en la cuenta.";
  }
  if (!/^\d{18}$/.test(c.cuenta.replace(/\D/g, ""))) return "La CLABE de cobro no está bien configurada.";
  if (!(c.monto > 0)) return "El monto tiene que ser mayor a cero.";
  return null;
}

/** HTML → texto corto y limpio (lo que se guarda y se enseña). */
export function textoDe(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&oacute;/g, "ó").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

/**
 * Lee lo que contestó Banxico. Puro: se prueba con respuestas guardadas.
 * Solo «liquidad…» (Liquidada / Liquidado) cuenta como verificado.
 */
export function interpretarRespuestaCep(html: string): ResultadoCep {
  const texto = textoDe(html);
  const t = texto.toLowerCase();
  if (/no encontrada/.test(t)) {
    return {
      estado: "no_encontrado",
      mensaje: "Banxico no encontró esa transferencia. Revisa que la fecha, la clave de rastreo, el banco y el monto sean EXACTOS como en el comprobante. Si todo cuadra y aun así no aparece, avísale a Manolo antes de dar el pago por bueno.",
      textoBanxico: texto,
    };
  }
  if (html.includes("meta:stats=ERR") || /no se ingres[oó] correctamente/.test(t)) {
    return { estado: "datos_invalidos", mensaje: "Banxico dice que faltan datos o no son válidos. Revisa la clave de rastreo y el banco.", textoBanxico: texto };
  }
  if (/horario de consulta/.test(t) && !/estado del pago/.test(t)) {
    return { estado: "fuera_de_horario", mensaje: "Banxico solo atiende de 9:30 a 23:00. Inténtalo dentro de ese horario.", textoBanxico: texto };
  }
  if (/devuelt|rechazad|cancelad/.test(t)) {
    return { estado: "no_concluyente", mensaje: "Banxico encontró la transferencia pero NO dice que se haya liquidado (puede estar devuelta o cancelada). No la des por buena: avísale a Manolo.", textoBanxico: texto };
  }
  if (/liquidad/.test(t)) {
    return { estado: "verificado", mensaje: "Banxico confirma que la transferencia se liquidó en la cuenta de Inbursa.", textoBanxico: texto };
  }
  if (/captcha|imagen de seguridad|c[oó]digo de seguridad/.test(t)) {
    return { estado: "sin_servicio", mensaje: "Banxico pidió un código de seguridad: hay que verificarla a mano en su página.", textoBanxico: texto };
  }
  return { estado: "no_concluyente", mensaje: "No se entendió la respuesta de Banxico. Revísala a mano en su página con los mismos datos.", textoBanxico: texto };
}

/**
 * La respuesta de `valida.do` llegó en UTF-8 el 12 nov 2026, aunque partes de la
 * página son ISO-8859-1: se lee como UTF-8 y, si sale basura, como latin1.
 */
async function texto(res: Response): Promise<string> {
  const buf = await res.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("latin1").decode(buf) : utf8;
}

/** Pregunta a Banxico. Nunca lanza: un fallo de red es «sin_servicio». */
export async function consultarCep(c: ConsultaCep, f: typeof fetch = fetch): Promise<ResultadoCep> {
  const invalido = validarConsulta(c);
  if (invalido) return { estado: "datos_invalidos", mensaje: invalido };
  try {
    // La página abre una sesión (cookie) antes de aceptar la consulta.
    const inicio = await f(`${BASE}/`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
    const cookie = (inicio.headers.get("set-cookie") ?? "")
      .split(/,(?=[^;]+=)/)
      .map((x) => x.split(";")[0].trim())
      .filter(Boolean)
      .join("; ");
    const res = await f(`${BASE}/valida.do`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE}/`,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: new URLSearchParams(formularioCep(c)).toString(),
      // Las consultas de días viejos tardan (la página avisa a los 25 s).
      signal: AbortSignal.timeout(45_000),
    });
    const html = await texto(res);
    if (!res.ok && !html) return { estado: "sin_servicio", mensaje: `Banxico no respondió (error ${res.status}). Inténtalo más tarde.` };
    return interpretarRespuestaCep(html);
  } catch (e) {
    console.error("banxicoCep:", (e as Error)?.message);
    return { estado: "sin_servicio", mensaje: "No se pudo hablar con Banxico ahora. Inténtalo en unos minutos o verifícala a mano en su página." };
  }
}

export interface BancoSpei { codigo: string; nombre: string }

/** Bancos que pueden mandar SPEI ese día (catálogo de Banxico), con caché de 12 h. */
const cacheBancos = new Map<string, { en: number; lista: BancoSpei[] }>();
export async function bancosSpei(fecha: string, f: typeof fetch = fetch): Promise<BancoSpei[]> {
  const [y, m, d] = fecha.split("-");
  const clave = `${d}-${m}-${y}`;
  const guardado = cacheBancos.get(clave);
  if (guardado && Date.now() - guardado.en < 12 * 3_600_000) return guardado.lista;
  const res = await f(`${BASE}/instituciones.do?fecha=${clave}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  const datos = (await res.json()) as { instituciones?: [string, string][] };
  const lista = (datos.instituciones ?? []).map(([codigo, nombre]) => ({ codigo, nombre }));
  if (lista.length) cacheBancos.set(clave, { en: Date.now(), lista });
  return lista;
}

/** La liga para verificarla a mano cuando el panel no puede. */
export const PAGINA_CEP = `${BASE}/`;
