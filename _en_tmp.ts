const T = require("./src/lib/tours");
const L = require("./src/lib/i18n/localize");
const fs = require("fs");
const out = T.TOURS_DB.map((t: any) => {
  const e = L.localizeTour(t, "en");
  return { slug: t.slug, nombre: e.nombre, tagline: e.tagline, tipo: e.tipo,
    urgencia: e.urgencia, descripcion: e.descripcion,
    destinos: e.destinos, incluye: T.incluyeDeTour(e, "en"),
    eleccion: e.eleccion, addOns: e.addOns,
    rutas: e.rutas ? e.rutas.map((r: any) => ({nombre:r.nombre, h:r.duracion_hrs, desde:r.desde})) : null };
});
fs.writeFileSync("/tmp/tours_en.json", JSON.stringify(out, null, 1));
console.log("ok", out.length);
