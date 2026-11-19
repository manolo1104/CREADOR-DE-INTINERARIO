/**
 * La cuenta donde los clientes transfieren (Inbursa de Manolo). Es la MISMA que
 * da el bot de WhatsApp (`whatsapp-bot/payment.js`): las dos salen de la
 * variable `BANK_CLABE` de Railway (sitio y bot). Si se cambia de cuenta, se
 * cambia ahí.
 *
 * 🔴 Sin respaldo escrito aquí (18 nov 2026): el repo es PÚBLICO. Si falta
 * `BANK_CLABE`, «Verificar con Banxico» lo dice y «Lo vi en la cuenta» sigue.
 *
 * Con ella se pregunta al CEP de Banxico si una transferencia llegó: Banxico
 * solo contesta si el pago fue a ESTA cuenta, por ESTE monto (12 nov 2026).
 */
export const CUENTA_COBRO = {
  /** Código del banco receptor en Banxico (Inbursa = 40036; la CLABE empieza con 036). */
  bancoCodigo: "40036",
  bancoNombre: "Inbursa",
  clabe: (process.env.BANK_CLABE || "").replace(/\D/g, ""),
} as const;

/** ¿Hay una CLABE completa (18 dígitos) para preguntarle a Banxico? */
export function hayClabeDeCobro(): boolean {
  return CUENTA_COBRO.clabe.length === 18;
}
