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

module.exports = { PAGO };
