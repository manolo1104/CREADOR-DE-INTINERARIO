import { NextResponse } from "next/server";
import { getClientes } from "@/lib/admin/clientes";

export const dynamic = "force-dynamic";

// La agrupación vive en `@/lib/admin/clientes` para que esta ruta y la pestaña
// /admin/clientes den siempre el mismo resultado (antes cada una tenía su
// propia copia y no coincidían: una sumaba lo cobrado y la otra lo vendido).
export async function GET() {
  try {
    return NextResponse.json(await getClientes());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
