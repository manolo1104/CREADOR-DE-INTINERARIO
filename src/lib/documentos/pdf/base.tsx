/**
 * Lo común de los PDF que arma el servidor (confirmación y cotización).
 *
 * 27 nov 2026 (Manolo): «haz que el panel cree el PDF directamente». Antes el
 * panel abría el HTML y le pedía al navegador imprimir; en el celular salían
 * márgenes, la URL y la fecha al pie, y la hoja no ocupaba la página. Ahora el
 * servidor arma un PDF de verdad con @react-pdf/renderer: sale idéntico en
 * cualquier teléfono o computadora.
 *
 * Las letras (Cormorant Garamond, DM Sans, DM Mono; OFL) y los logos en PNG
 * viven en `src/assets/pdf`. Las letras no traen →, ✓, ● ni №: esos se dibujan
 * (`Flecha`, `Palomita`, `Punto`) o se escriben «Nº».
 */
import path from "path";
import React from "react";
import { Font, Svg, Path, Circle, StyleSheet } from "@react-pdf/renderer";

const DIR = path.join(process.cwd(), "src", "assets", "pdf");
export const recurso = (archivo: string) => path.join(DIR, archivo);

let registradas = false;
export function registrarFuentes() {
  if (registradas) return;
  registradas = true;
  Font.register({
    family: "Cormorant",
    fonts: [
      { src: recurso("cormorant-garamond-300-normal.ttf"), fontWeight: 300 },
      { src: recurso("cormorant-garamond-300-italic.ttf"), fontWeight: 300, fontStyle: "italic" },
      { src: recurso("cormorant-garamond-400-normal.ttf"), fontWeight: 400 },
      { src: recurso("cormorant-garamond-400-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: recurso("cormorant-garamond-500-normal.ttf"), fontWeight: 500 },
    ],
  });
  Font.register({
    family: "DMSans",
    fonts: [
      { src: recurso("dm-sans-300-normal.ttf"), fontWeight: 300 },
      { src: recurso("dm-sans-400-normal.ttf"), fontWeight: 400 },
      { src: recurso("dm-sans-500-normal.ttf"), fontWeight: 500 },
      { src: recurso("dm-sans-700-normal.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "DMMono", src: recurso("dm-mono-400-normal.ttf") });
  // Sin guiones a media palabra: un nombre de tour partido en «Aquis-món» se ve roto.
  Font.registerHyphenationCallback((palabra) => [palabra]);
}

/** Milímetros a puntos (react-pdf mide en puntos). */
export const mm = (n: number) => n * 2.8346;

export const C = {
  negro: "#0e1710",
  verdeProfundo: "#1a2e1a",
  verdeSelva: "#3a6b1a",
  lima: "#8fbe3a",
  crema: "#f4edd8",
  arena: "#e6d4b0",
  dorado: "#c4882a",
  terracota: "#9a4a1e",
  papel: "#fffaf0",
  wa: "#25D366",
  tinta55: "rgba(14,23,16,0.55)",
  tinta65: "rgba(14,23,16,0.65)",
  // Los bordes con transparencia salen rosas en react-pdf: van en sólido.
  linea: "#d3ccb8",
};

/** Lo que las letras no traen, cambiado por algo que sí. */
export function limpio(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/\s*→\s*/g, " – ")
    .replace(/№/g, "Nº")
    .replace(/[✓✔]/g, "")
    .replace(/[●★]/g, "")
    .trim();
}

export const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

export function Flecha({ color = C.verdeSelva, size = 6 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M1 5 H8 M5.5 2.5 L8 5 L5.5 7.5" stroke={color} strokeWidth={1.2} fill="none" />
    </Svg>
  );
}

export function Palomita({ color = C.verdeSelva, size = 6.5 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M1.5 5.2 L4 7.6 L8.6 2.4" stroke={color} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

export function Punto({ color = "#ffffff", size = 7 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Circle cx={5} cy={5} r={4.5} fill={color} />
    </Svg>
  );
}

export const base = StyleSheet.create({
  pagina: { backgroundColor: C.crema, fontFamily: "DMSans", color: C.negro, fontSize: 8.5 },
  etiqueta: { fontSize: 6.8, letterSpacing: 1.6, textTransform: "uppercase" },
});
