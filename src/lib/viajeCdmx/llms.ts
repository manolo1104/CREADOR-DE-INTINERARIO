import { salidasPublicas } from "./salidas";
import { viajeParaLlms, viajeParaLlmsEn } from "./seo";

/**
 * El bloque del viaje para llms.txt (español) y /en/llms.txt (inglés), con las
 * fechas y el precio de hoy. Si la base tarda más de 1.5 s o falla, `null`: el
 * archivo sale sin el bloque (la página del viaje sigue en «Páginas clave»),
 * nunca con una cifra vieja.
 */
export async function viajeCdmxParaLlms(locale: "es" | "en" = "es"): Promise<string | null> {
  try {
    const salidas = await Promise.race([
      salidasPublicas(),
      new Promise<never>((_, no) => setTimeout(() => no(new Error("lento")), 1500)),
    ]);
    return locale === "en" ? viajeParaLlmsEn(salidas) : viajeParaLlms(salidas);
  } catch {
    return null;
  }
}
