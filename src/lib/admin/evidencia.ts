// Qué archivos se aceptan como comprobante del pago al proveedor, y cómo
// averiguar de qué tipo son.
//
// Vive aquí y no en la ruta porque un `route.ts` de Next solo puede exportar
// sus verbos (GET, POST…) y su configuración: exportar una función suelta
// rompe la compilación de producción aunque el chequeo de tipos pase.

export const MAX_BYTES_EVIDENCIA = 5 * 1024 * 1024;

export const TIPOS_OK = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * 🔴 El navegador no siempre sabe qué tipo es un archivo: una foto HEIC del
 * iPhone, un PDF llegado por WhatsApp o cualquier cosa arrastrada desde
 * ciertas apps llegan con `type` vacío o "application/octet-stream". Antes eso
 * se rechazaba con "Solo se aceptan PDF o imágenes" delante de un archivo que
 * SÍ era una captura — y desde el panel parecía que subir no servía.
 *
 * Cuando el navegador no lo dice, se deduce de la extensión.
 */
const EXT_MIME: Record<string, string> = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export function tipoDeArchivo(nombre: string, tipoDeclarado: string): string {
  const declarado = (tipoDeclarado || "").toLowerCase().split(";")[0].trim();
  if (TIPOS_OK.has(declarado)) return declarado;
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return EXT_MIME[ext] ?? declarado;
}
