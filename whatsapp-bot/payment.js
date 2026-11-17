// ════════════════════════════════════════════════════════════════════
// Datos de pago para el bot (transferencia + OXXO).
// Se leen del .env (recomendado, no se commitea). Si no están, usa los
// valores de respaldo de abajo. En Railway, configúralos como variables.
// ════════════════════════════════════════════════════════════════════

const PAGO = {
  banco: process.env.BANK_NAME || "Inbursa",
  titular: process.env.BANK_TITULAR || "Manuel Arturo Covarrubias Martinez",
  clabe: process.env.BANK_CLABE || "036180500744560342",
  oxxo: process.env.OXXO_REFERENCIA || "4217 4701 3134 5718",
  // El concepto es lo único que nos deja emparejar un depósito con su
  // cotización: sin él hay que perseguir al cliente para saber de quién es.
  instrucciones:
    "IMPORTANTE: pon el FOLIO de la cotización como CONCEPTO o referencia de la transferencia — con eso identificamos tu pago. Una vez realizado, envía tu comprobante a este chat. Tu reservación solo queda CONFIRMADA cuando recibimos el comprobante.",
};

function montoMx(n) {
  return `$${Math.round(Number(n)).toLocaleString("es-MX")} MXN`;
}

/**
 * El mensaje de datos de pago, listo para mandarse tal cual (es/en).
 *
 * Lleva lo que le faltaba a la plantilla del equipo y costó ventas:
 *   · el MONTO: sin él, el cliente preguntaba «¿cuánto deposito?» o pagaba
 *     de más;
 *   · «para transferir usa la CLABE»: un cliente transfirió al número de la
 *     tarjeta de OXXO, su banco le dijo «cuenta inexistente» y se perdieron
 *     2.5 h;
 *   · el folio como concepto: es lo único que empareja el depósito con la
 *     cotización.
 * Y nunca dice que la reserva YA está confirmada: eso solo pasa cuando el
 * equipo valida el pago (/confirma).
 *
 * @param {{folio?:string, monto?:number, locale?:"es"|"en"}} datos
 */
function mensajeDatosPago({ folio, monto, locale } = {}) {
  const en = String(locale || "").toLowerCase().startsWith("en");
  const folioTxt = String(folio || "").trim().toUpperCase();
  const conMonto = Number.isFinite(Number(monto)) && Number(monto) > 0;
  const lineas = en
    ? [
        "💳 *Payment details*",
        "",
        `🏦 Bank: ${PAGO.banco}`,
        `👤 Account holder: ${PAGO.titular}`,
        `🔢 CLABE (for bank transfers): ${PAGO.clabe}`,
        `🏪 Cash deposit at OXXO (card number): ${PAGO.oxxo}`,
        "",
        ...(conMonto ? [`💰 *Amount:* ${montoMx(monto)}`] : []),
        `📝 *Payment reference:* ${folioTxt || "your quote number"}`,
        "",
        "⚠️ For a bank transfer use the *CLABE*; the card number is only for cash deposits at OXXO stores.",
        "Once you pay, send us the receipt in this chat. Your booking is confirmed once we verify the payment. 🌿",
      ]
    : [
        "💳 *Datos para tu pago*",
        "",
        `🏦 Banco: ${PAGO.banco}`,
        `👤 Titular: ${PAGO.titular}`,
        `🔢 CLABE interbancaria: ${PAGO.clabe}`,
        `🏪 Depósito en OXXO (número de tarjeta): ${PAGO.oxxo}`,
        "",
        ...(conMonto ? [`💰 *Monto:* ${montoMx(monto)}`] : []),
        `📝 *Concepto:* ${folioTxt || "tu folio de cotización"}`,
        "",
        "⚠️ Para transferir usa la *CLABE*; la tarjeta es solo para depositar en OXXO.",
        "Cuando pagues, mándanos el comprobante a este chat. Tu reserva queda confirmada cuando validamos el pago. 🌿",
      ];
  return lineas.join("\n");
}

module.exports = { PAGO, mensajeDatosPago };
