/**
 * La piel de las páginas de venta de Xantolo (el paquete con hotel y la noche
 * sin hotel): fondo de noche, cempasúchil de acento y la entrada del hero.
 * Vive aquí para que las dos páginas no se separen con el tiempo.
 */

export const XAN_FONDO = "#140a18";
export const XAN_FLOR = "#f29422";
export const XAN_TINTA_BOTON = "#1a0c1f";
export const XAN_MORADO = "#2a1231";

/**
 * 🔴 Va con `dangerouslySetInnerHTML` y no como hijo de texto de <style>: React
 * escapa el texto en el servidor (las comillas salen como &quot;), dentro de
 * <style> el navegador no lo decodifica, y la hidratación truena con el error
 * #425 porque el cliente sí trae las comillas.
 */
export const XAN_CSS_ENTRADA = `
        @keyframes xan-sube { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes xan-asienta { from { transform: scale(1.06); } to { transform: none; } }
        .xan-sube { animation: xan-sube .7s cubic-bezier(.16,1,.3,1) both; }
        .xan-asienta { animation: xan-asienta 1.6s cubic-bezier(.16,1,.3,1) both; }
        .xan-num { font-variant-numeric: lining-nums tabular-nums; font-feature-settings: "lnum" 1, "tnum" 1; }
        @media (prefers-reduced-motion: reduce) { .xan-sube, .xan-asienta { animation: none; } }
      `;
