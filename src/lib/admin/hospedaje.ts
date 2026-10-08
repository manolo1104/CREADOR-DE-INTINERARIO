/**
 * Dónde se hospeda el cliente de una reserva: lo que hace falta para pasar por
 * él el día del recorrido.
 *
 * Vive aquí, y no dentro de la pantalla que lo pinta, porque el dato NO está en
 * un campo: está en cuatro formatos distintos según por dónde entró la reserva,
 * y cualquier pantalla que lo quiera enseñar tiene que leerlos todos. Con la
 * regla escrita una sola vez, arreglar un formato nuevo se hace en un sitio.
 *
 *   1. `packageItems` — contrató el hospedaje con nosotros: sabemos el hotel y
 *      hasta la habitación.
 *   2. `Recogida: …` dentro de `notes` — el caso NORMAL, el de las reservas de
 *      la web. Lo guarda así `api/tours/send-confirmation`, que lo vuelve a
 *      leer con esta misma expresión para armar el correo.
 *   3. `RECOGER EN: …` — lo escribe el webhook de Stripe cuando el cliente no
 *      llegó a la pantalla de confirmación, y las reservas de evento.
 *   4. `Hospedaje: …` — el mismo dato por esa misma ruta del webhook.
 *
 * Las notas van unidas con " | ", así que cada línea se corta en la barra.
 */

/** Lo mínimo de una reserva para saber dónde se hospeda. */
export interface ReservaConHospedaje {
  notes: string | null;
  packageItems: unknown;
}

export function hospedajeDeReserva(b: ReservaConHospedaje): string | null {
  const pkgs = Array.isArray(b.packageItems) ? (b.packageItems as Array<Record<string, unknown>>) : [];
  const conHotel = pkgs.find((p) => p && (p.hotel || p.habitacion));
  if (conHotel) {
    return [
      String(conHotel.hotel || "Hotel Paraíso Encantado"),
      conHotel.habitacion ? String(conHotel.habitacion) : "",
    ].filter(Boolean).join(" · ");
  }

  const notas = b.notes || "";
  const m = notas.match(/Recogida:\s*([^|]+)/i)
    || notas.match(/RECOGER EN:\s*([^|]+)/i)
    || notas.match(/Hospedaje:\s*([^|]+)/i);
  const texto = m ? m[1].trim() : "";
  return texto || null;
}
