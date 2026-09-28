import { prisma } from "@/lib/prisma";
import BitacoraClient from "./BitacoraClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bitácora — Admin" };

// Se traen los últimos 500 movimientos: suficiente para revisar una temporada
// completa sin paginar, y poco para que la página siga abriendo al instante.
const LIMITE = 500;

export default async function BitacoraPage() {
  const registros = await prisma.bitacora.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE,
  });

  return (
    <BitacoraClient
      registros={registros.map(r => ({
        id:         r.id,
        fecha:      r.createdAt.toISOString(),
        usuario:    r.usuario,
        nombre:     r.nombre,
        rol:        r.rol,
        accion:     r.accion,
        entidad:    r.entidad,
        referencia: r.referencia,
        resumen:    r.resumen,
        detalle:    (r.detalle as any) ?? null,
      }))}
      limite={LIMITE}
    />
  );
}
