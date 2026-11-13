// Preparación de salidas (Fase 4, 4 nov 2026): la confirmación de 48 h de
// cada cliente queda lista en su chat de la Bandeja como propuesta; una
// persona la aprueba con un clic. Sin Claude: es un texto fijo con los datos
// de la salida (punto de encuentro, hora, qué llevar, saldo), así no cuesta y
// no se equivoca. Mientras no haya plantillas de Meta, esto es la
// «confirmación de 48 h» del plan.

export interface DatosConfirmacion {
  nombre: string;
  idioma: string;
  tour: string;
  /** YYYY-MM-DD */
  fecha: string;
  hora: string | null;
  punto: string | null;
  queLlevar: string[];
  /** Lo que se cobra en sitio (0 = nada). */
  saldo: number;
  operador: string;
}

const pila = (n: string) => n.trim().split(/\s+/)[0] || n;
const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

export function textoConfirmacion(d: DatosConfirmacion): string {
  const f = new Date(`${d.fecha}T12:00:00Z`);
  const en = d.idioma === "en";
  const dia = f.toLocaleDateString(en ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const llevar = d.queLlevar.map(s => s.trim()).filter(Boolean).slice(0, 6);
  // La hora puede ser «08:00» o un rango del catálogo («entre 8:00 y 9:00 AM»).
  const cuando = !d.hora ? "" : /^\d/.test(d.hora) ? (en ? ` at ${d.hora}` : ` a las ${d.hora}`) : `, ${d.hora}`;
  if (en) {
    return [
      `Hi ${pila(d.nombre)}, this is ${d.operador} from Huasteca Potosina Tours. We're confirming your ${d.tour} on ${dia}${cuando}.`,
      d.punto ? `Meeting point: ${d.punto}.` : "",
      llevar.length ? `Please bring: ${llevar.join(", ")}.` : "",
      d.saldo > 0 ? `The remaining balance of ${fmx(d.saldo)} MXN is paid on site.` : "",
      "Could you confirm you'll be there?",
    ].filter(Boolean).join("\n");
  }
  return [
    `Hola ${pila(d.nombre)}, soy ${d.operador} de Huasteca Potosina Tours. Te confirmamos tu ${d.tour} el ${dia}${cuando}.`,
    d.punto ? `Punto de encuentro: ${d.punto}.` : "",
    llevar.length ? `Qué llevar: ${llevar.join(", ")}.` : "",
    d.saldo > 0 ? `El saldo de ${fmx(d.saldo)} se paga en sitio.` : "",
    "¿Nos confirmas que ahí te vemos?",
  ].filter(Boolean).join("\n");
}

/** Lo que se le manda al proveedor para confirmar la salida (se abre en WhatsApp con el texto puesto). */
export function textoProveedor(p: { contacto: string | null; nombre: string }, tour: string, fecha: string, personas: number): string {
  const f = new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return `Hola${p.contacto ? ` ${pila(p.contacto)}` : ""}, te confirmo ${tour} el ${f}: ${personas} ${personas === 1 ? "persona" : "personas"}. ¿Todo listo de tu lado?`;
}
