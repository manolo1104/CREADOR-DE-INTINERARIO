import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RIO_CONFIG_KEY, normalizarRioConfig, rioPorTemporada } from "@/lib/rioEstado";

export const dynamic = "force-dynamic";

// La sesión la exige el middleware (todo /api/admin salvo login/logout).

/** Lo guardado tal cual, para pintar el control del panel. */
export async function GET() {
  try {
    const fila = await prisma.config.findUnique({ where: { key: RIO_CONFIG_KEY } });
    const cfg = normalizarRioConfig(fila ? JSON.parse(fila.value) : null);
    return NextResponse.json({ ...cfg, temporada: rioPorTemporada() });
  } catch {
    return NextResponse.json({ estado: "auto", temporada: rioPorTemporada() });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const cfg = normalizarRioConfig(body);
  await prisma.config.upsert({
    where:  { key: RIO_CONFIG_KEY },
    update: { value: JSON.stringify(cfg) },
    create: { key: RIO_CONFIG_KEY, value: JSON.stringify(cfg) },
  });
  return NextResponse.json({ ok: true, ...cfg });
}
