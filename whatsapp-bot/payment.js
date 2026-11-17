// ════════════════════════════════════════════════════════════════════
// Datos de pago para el bot: transferencia, OXXO y la liga de tarjeta, en UN
// solo mensaje («Estructura de oro», 16 nov 2026: los datos bancarios iban en
// el 67 % de las reservas y la liga de tarjeta solo en el 27 %, aunque 17
// clientes la pidieron).
//
// 🔴 Los datos bancarios salen SOLO de las variables de entorno (BANK_NAME,
// BANK_TITULAR, BANK_CLABE, OXXO_REFERENCIA). El repo es PÚBLICO: antes iban
// escritos aquí de respaldo. Fuera de producción (pruebas y simulador) se usan
// unos de mentira, para que nadie copie unos reales de un ejemplo.
// ════════════════════════════════════════════════════════════════════

const EN_PRODUCCION = process.env.NODE_ENV === "production";
const DE_PRUEBA = { banco: "Banco de prueba", titular: "Titular de prueba", clabe: "000000000000000000", oxxo: "0000 0000 0000 0000" };

const PAGO = {
  banco: process.env.BANK_NAME || (EN_PRODUCCION ? "" : DE_PRUEBA.banco),
  titular: process.env.BANK_TITULAR || (EN_PRODUCCION ? "" : DE_PRUEBA.titular),
  clabe: process.env.BANK_CLABE || (EN_PRODUCCION ? "" : DE_PRUEBA.clabe),
  oxxo: process.env.OXXO_REFERENCIA || (EN_PRODUCCION ? "" : DE_PRUEBA.oxxo),
};

/** ¿Están los datos para transferir? Sin CLABE no se manda nada bancario. */
const HAY_DATOS_BANCO = Boolean(PAGO.clabe);
if (EN_PRODUCCION && !HAY_DATOS_BANCO) {
  console.warn("⚠️ Faltan BANK_CLABE y compañía: el bot no puede dar datos de transferencia (solo la liga de tarjeta).");
}

function montoMx(n) {
  return `$${Math.round(Number(n)).toLocaleString("es-MX")} MXN`;
}

/**
 * El mensaje de pago, listo para mandarse tal cual (es/en). Lleva:
 *   · el MONTO (sin él el cliente preguntaba «¿cuánto deposito?»);
 *   · «para transferir usa la CLABE» (alguien transfirió al número de la
 *     tarjeta de OXXO y su banco le dijo «cuenta inexistente»);
 *   · el folio como concepto (lo único que empareja el depósito);
 *   · la liga de tarjeta sin comisión, o una por persona;
 *   · «Quedo en espera del comprobante», como cierra Erick.
 * Nunca dice que la reserva ya está confirmada: eso pasa al validar el pago.
 *
 * @param {{folio?:string, monto?:number, locale?:"es"|"en", liga?:string|null,
 *   ligas?:{parte:number, de:number, url:string, monto:number, pagada?:boolean, nombre?:string}[]}} datos
 */
function mensajeDatosPago({ folio, monto, locale, liga, ligas } = {}) {
  const en = String(locale || "").toLowerCase().startsWith("en");
  const folioTxt = String(folio || "").trim().toUpperCase();
  const conMonto = Number.isFinite(Number(monto)) && Number(monto) > 0;
  const partes = Array.isArray(ligas) ? ligas.filter((l) => l && l.url && !l.pagada) : [];

  const banco = HAY_DATOS_BANCO
    ? en
      ? [
          `🏦 Bank: ${PAGO.banco}`,
          `👤 Account holder: ${PAGO.titular}`,
          `🔢 CLABE (for bank transfers): ${PAGO.clabe}`,
          `🏪 Cash deposit at OXXO (card number): ${PAGO.oxxo}`,
        ]
      : [
          `🏦 Banco: ${PAGO.banco}`,
          `👤 Titular: ${PAGO.titular}`,
          `🔢 CLABE interbancaria: ${PAGO.clabe}`,
          `🏪 Depósito en OXXO (número de tarjeta): ${PAGO.oxxo}`,
        ]
    : [];

  const tarjeta = partes.length
    ? [
        en ? "💳 *By card, one link per person (no fee):*" : "💳 *Con tarjeta, una liga por persona (sin comisión):*",
        ...partes.map((l) => `${l.nombre ? `*${l.nombre}*` : `${en ? "Part" : "Parte"} ${l.parte}/${l.de}`} · ${montoMx(l.monto)}\n${l.url}`),
      ]
    : liga
      ? [en ? "💳 *By card (no fee):*" : "💳 *Con tarjeta (sin comisión):*", liga]
      : [];

  const L = [
    en ? "💳 *How to pay*" : "💳 *Datos para tu pago*",
    "",
    ...banco,
    ...(banco.length ? [""] : []),
    ...(conMonto ? [en ? `💰 *Amount:* ${montoMx(monto)}` : `💰 *Monto:* ${montoMx(monto)}`] : []),
    ...(banco.length ? [en ? `📝 *Payment reference:* ${folioTxt || "your quote number"}` : `📝 *Concepto:* ${folioTxt || "tu folio de cotización"}`] : []),
    ...(tarjeta.length ? ["", ...tarjeta] : []),
    "",
    ...(banco.length ? [en ? "⚠️ For a bank transfer use the *CLABE*; the card number is only for cash deposits at OXXO stores." : "⚠️ Para transferir usa la *CLABE*; la tarjeta es solo para depositar en OXXO."] : []),
    en
      ? "Your booking is confirmed once we verify the payment. I'll be waiting for your receipt here. 🌿"
      : "Tu reserva queda confirmada cuando validamos el pago. Quedo en espera de tu comprobante por aquí. 🌿",
  ];
  return L.join("\n").replace(/\n{3,}/g, "\n\n");
}

module.exports = { PAGO, HAY_DATOS_BANCO, mensajeDatosPago };
