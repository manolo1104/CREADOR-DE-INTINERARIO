// Solo servidor: preparar una salida a 48 h (Fase 4, 4 nov 2026). Deja la
// confirmación de cada cliente como propuesta en su chat de la Bandeja; a los
// que no tienen chat, el panel les ofrece el WhatsApp con el texto ya puesto.
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { normalizarTelefono } from "../crm";
import { salidaPorClave } from "../salidasDia";
import { salidaCancelada } from "../salidas";
import { registrarEnBitacora } from "../bitacora";
import { ErrorAgente } from "./claude";
import { textoConfirmacion } from "./confirmaciones";

export async function prepararConfirmaciones(clave: string, quien: string) {
  const s = await salidaPorClave(clave);
  if (!s) throw new ErrorAgente("Esa salida no existe o ya no tiene reservas.");
  // 🔴 A una salida cancelada no se le confirma nada al cliente (lote 6, 10 nov 2026).
  if (salidaCancelada(s.registro.estado)) throw new ErrorAgente("Esta salida está cancelada: no se le preparan confirmaciones. Si sí sale, cambia su estado primero.");
  const queLlevar = (s.protocolo?.ruta?.queLlevar ?? "").split("\n");
  // El nombre corto («Rafting en el Tampaón»), no el de la ficha de venta.
  const tour = TOURS_LISTA.find(t => t.slug === s.slug)?.nombreCorto || s.tourNombre;
  let enChat = 0, yaEstaban = 0;
  const sinChat: { cliente: string; telefono: string | null; texto: string }[] = [];
  for (const p of s.pasajeros) {
    const telefono = normalizarTelefono(p.telefono);
    const texto = textoConfirmacion({
      nombre: p.cliente, idioma: p.idioma, tour, fecha: s.fecha, hora: s.protocolo?.hora ?? null,
      punto: s.protocolo?.lugar ?? null, queLlevar, saldo: p.pago === "saldo" ? p.saldo : 0, operador: quien,
    });
    const conv = telefono ? await prisma.conversacion.findFirst({ where: { telefono, noEsCliente: false }, orderBy: { ultimoMensajeEn: "desc" } }) : null;
    if (!conv) { sinChat.push({ cliente: p.cliente, telefono, texto }); continue; }
    // Una por chat y salida: volver a picar el botón no la duplica.
    const ya = await prisma.propuestaAgente.findFirst({ where: { conversacionId: conv.id, tipo: "confirmacion", referencia: clave, estado: { in: ["pendiente", "aprobada", "editada"] } } });
    if (ya) { yaEstaban++; continue; }
    await prisma.propuestaAgente.create({ data: { tipo: "confirmacion", conversacionId: conv.id, referencia: clave, borrador: texto, razon: `Confirmación 48 h: ${s.tourNombre}` } });
    enChat++;
  }
  await registrarEnBitacora({ accion: "creó", entidad: "salida", referencia: clave, resumen: `${quien} preparó las confirmaciones de ${s.tourNombre} (${s.fecha}): ${enChat} en la Bandeja, ${sinChat.length} sin chat` });
  return { enChat, yaEstaban, sinChat };
}
