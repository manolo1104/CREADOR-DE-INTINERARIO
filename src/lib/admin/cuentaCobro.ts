/**
 * La cuenta donde los clientes transfieren (Inbursa de Manolo). Es la MISMA que
 * da el bot de WhatsApp (`whatsapp-bot/payment.js`, que lee `BANK_CLABE` con
 * este mismo respaldo): si se cambia de cuenta, se cambia en los dos lados o en
 * la variable `BANK_CLABE` de Railway (web y bot).
 *
 * Con ella se pregunta al CEP de Banxico si una transferencia llegó: Banxico
 * solo contesta si el pago fue a ESTA cuenta, por ESTE monto (12 nov 2026).
 */
export const CUENTA_COBRO = {
  /** Código del banco receptor en Banxico (Inbursa = 40036; la CLABE empieza con 036). */
  bancoCodigo: "40036",
  bancoNombre: "Inbursa",
  clabe: (process.env.BANK_CLABE || "036180500744560342").replace(/\D/g, ""),
} as const;
