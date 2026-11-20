import fs from "fs";
import path from "path";

/**
 * El PDF que va ADJUNTO en cada correo de confirmación al cliente (20 nov 2026,
 * Manolo: «ese [la guía gratis] ya no lo vas a mandar en las confirmaciones;
 * en las confirmaciones se mandará la bienvenida»).
 *
 * Son dos páginas: qué sigue (folio, mensaje del guía un día antes, recogida),
 * qué llevar, qué pasa si llueve, cómo se paga el resto y la política de
 * cancelación. Viven en `public/documentos/bienvenida-{es,en}.pdf`; las diseñó
 * Manolo fuera del repo.
 *
 * Antes se adjuntaba `public/guia-huasteca-potosina.pdf`, la guía para quien
 * todavía está decidiendo: a quien ya pagó le sirve más saber qué sigue.
 *
 * Si el archivo no está, devuelve [] y el correo sale de todos modos (mismo
 * criterio que tenía el adjunto de la guía).
 */
export function adjuntoBienvenida(locale?: string | null): { name: string; content: string }[] {
  const en = locale === "en";
  try {
    const archivo = path.join(process.cwd(), "public", "documentos", en ? "bienvenida-en.pdf" : "bienvenida-es.pdf");
    return [{
      name: en ? "Welcome-Huasteca-Potosina-Tours.pdf" : "Bienvenida-Huasteca-Potosina-Tours.pdf",
      content: fs.readFileSync(archivo).toString("base64"),
    }];
  } catch {
    return [];
  }
}
