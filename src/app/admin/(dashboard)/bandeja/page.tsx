import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { codigoDeTour } from "@/lib/admin/coloresTour";
import { sesionActual } from "@/lib/admin/sesion";
import { detalleConversacion, estadoConexion, listarConversaciones } from "@/lib/admin/bandejaDatos";
import BandejaClient from "./BandejaClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bandeja — Admin" };

/**
 * La Bandeja de WhatsApp (Fase 2.3, 4 nov 2026): los chats del número del
 * negocio dentro del panel, sin Meta (un puente vinculado como WhatsApp Web).
 * Lista → conversación → lead, con lo urgente arriba.
 */
export default async function BandejaPage({ searchParams }: { searchParams: { chat?: string } }) {
  const chat = typeof searchParams?.chat === "string" ? searchParams.chat : null;
  const [sesion, conversaciones, detalle, conexion, rapidasFila] = await Promise.all([
    sesionActual(), listarConversaciones(), chat ? detalleConversacion(chat) : Promise.resolve(null), estadoConexion(),
    prisma.config.findUnique({ where: { key: "bandeja:rapidas" } }).catch(() => null),
  ]);
  let rapidas: string[] = [];
  try { const v = JSON.parse(rapidasFila?.value ?? "[]"); if (Array.isArray(v)) rapidas = v.map(String).slice(0, 40); } catch { /* vacías */ }
  const veQr = sesion?.rol === "dueno" || sesion?.rol === "socio";
  const tours = TOURS_LISTA.map(t => ({ slug: t.slug, codigo: codigoDeTour(t.slug), nombre: t.nombre }));
  return (
    <BandejaClient inicial={{ conversaciones, detalle, conexion: conexion ? { ...conexion, qr: veQr ? conexion.qr : null } : null }}
      chatInicial={chat} rapidas={rapidas} quien={sesion?.nombre ?? ""} tours={tours} />
  );
}
