import { redirect } from "next/navigation";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";

/**
 * Adaptador. Esta URL ya no tiene pantalla propia: el carrito es la única
 * experiencia de reserva del sitio.
 *
 * ⚠️ NO se borra ni se cambia de dirección. El bot de WhatsApp la manda EN VIVO
 * (`whatsapp-bot/agent.js` → `enviar_link_pago`) y los correos de rescate ya
 * enviados apuntan aquí. Es la razón de ser de este archivo.
 *
 * Es un Server Component a propósito, no una pantalla que agregue y navegue:
 * el tráfico que llega por aquí viene del navegador dentro de WhatsApp, donde
 * una pantalla intermedia parpadea; y en cliente el doble montaje de efectos de
 * React puede agregar el recorrido dos veces. Aquí no hay JS que pueda fallar.
 */

export const dynamic = "force-dynamic";

export default function ReservarTourRedirect({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { recuperar?: string };
}) {
  const recuperar = searchParams?.recuperar
    ? `recuperar=${encodeURIComponent(searchParams.recuperar)}`
    : "";

  // 1. Paquetes primero. Los correos de rescate viejos de PAQUETE armaban su
  //    link como /reservar-tour/<slug>, que nunca existió; se reencaminan.
  //    Antes esto se hacía en cliente y pintaba un "Llevándote a tu paquete…".
  if (PAQUETES_DB.some((p) => p.slug === params.slug)) {
    redirect(`/reservar-paquete/${params.slug}${recuperar ? `?${recuperar}` : ""}`);
  }

  // 2. Tour que ya no existe: al catálogo, no a un 404. Un 404 aquí es una
  //    salida del embudo para alguien que venía con intención de reservar.
  if (!TOURS_DB.some((t) => t.slug === params.slug)) {
    redirect("/reservar");
  }

  // 3. Lo normal: al carrito, con el recorrido dentro.
  //    `redirect()` de Next emite un 307 TEMPORAL, que es justo lo que se
  //    quiere: un 308 se cachea en el navegador del cliente para siempre y
  //    dejaría esta ruta congelada aunque algún día vuelva a tener pantalla.
  const qs = [`agregar=${params.slug}`, recuperar].filter(Boolean).join("&");
  redirect(`/reservar/carrito?${qs}`);
}
