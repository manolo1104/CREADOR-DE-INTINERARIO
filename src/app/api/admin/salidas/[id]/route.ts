import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { editarSalida, type FormSalida } from "@/lib/viajeCdmx/admin";
import { apagarLigasDeSalida } from "@/lib/viajeCdmx/pasajeros";
import { respuestaDeError } from "@/lib/viajeCdmx/respuesta";
import { administraSalidasCdmx } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ETIQUETAS: Record<string, string> = {
  fechaSalida: "Salida", fechaRegreso: "Regreso", capacidad: "Cupo", minimo: "Mínimo", precio: "Precio",
  precioPreventa: "Preventa", abreEl: "Abre", finPreventa: "Fin de preventa", fechaCorte: "Corte",
  saldoDiasAntes: "Días para liquidar", estado: "Estado", hotelBloqueado: "Cuartos bloqueados", notas: "Notas",
};
const comparable = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

/**
 * Editar una salida. El precio nuevo vale para lo que se aparte de aquí en
 * adelante: lo ya apartado conserva el suyo.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await sesionActual();
  // Lista blanca (lote 8, 10 nov 2026): Manolo y Martín; antes solo se frenaba a Operación y el guía pasaba.
  if (!sesion || !administraSalidasCdmx(sesion.rol)) return NextResponse.json({ error: "Solo Manolo o Martín editan salidas." }, { status: 403 });
  let b: FormSalida;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const { antes, despues } = await editarSalida(params.id, b);
    // Cancelada: las ligas del saldo de sus pasajeros ya no se pueden pagar (lote 3, 5 nov 2026).
    if (despues.estado === "cancelada" && antes.estado !== "cancelada") await apagarLigasDeSalida(despues.id, despues.fechaSalida);
    const detalle = Object.keys(ETIQUETAS)
      .filter((k) => JSON.stringify(comparable((antes as never)[k])) !== JSON.stringify(comparable((despues as never)[k])))
      .map((k) => ({ campo: ETIQUETAS[k], antes: comparable((antes as never)[k]), despues: comparable((despues as never)[k]) }));
    if (detalle.length) {
      await registrarEnBitacora({
        accion: "modificó", entidad: "salida", referencia: despues.fechaSalida,
        resumen: `Salida del viaje CDMX ${despues.fechaSalida}: ${detalle.map((d) => d.campo).join(", ")}`,
        detalle,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaDeError(e, "editar_salida");
  }
}
