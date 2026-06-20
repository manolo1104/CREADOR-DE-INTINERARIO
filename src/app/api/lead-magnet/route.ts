import { NextResponse } from "next/server";

// La "guía gratuita" fue descontinuada: ahora el mismo contenido se vende como
// producto ("Guía Definitiva", $49) en /guia. Este endpoint queda DESACTIVADO a
// propósito para no regalar el contenido y no canibalizar la venta.
export async function POST() {
  return NextResponse.json(
    {
      error: "La guía gratuita ya no está disponible. Consíguela completa en /guia.",
      redirect: "/guia",
    },
    { status: 410 },
  );
}
