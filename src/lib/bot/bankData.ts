/** Datos bancarios para cotizaciones por transferencia (bot de WhatsApp). */
export const DATOS_BANCO = {
  banco:   process.env.BANK_NAME    || "",
  titular: process.env.BANK_TITULAR || "",
  clabe:   process.env.BANK_CLABE   || "",
  cuenta:  process.env.BANK_CUENTA  || "",
};

export function datosBancoConfigurados(): boolean {
  return Boolean(DATOS_BANCO.banco && DATOS_BANCO.titular && (DATOS_BANCO.clabe || DATOS_BANCO.cuenta));
}
