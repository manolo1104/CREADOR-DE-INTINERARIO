/** Maps destino slug → tours that include it */
export const DESTINO_EN_TOURS: Record<string, { nombre: string; slug: string }[]> = {
  "sotano-de-las-huahuas":          [{ nombre: "Expedición Tamul",    slug: "expedicion-tamul" }],
  "sotano-de-las-golondrinas":      [{ nombre: "Expedición Tamul",    slug: "expedicion-tamul" }],
  "cascada-de-tamul":               [{ nombre: "Expedición Tamul",    slug: "expedicion-tamul" }, { nombre: "Rappel en Tamul", slug: "rappel-tamul" }],
  "rio-tampaon-rafting":            [{ nombre: "Rafting en el Tampaón", slug: "rafting-rio-tampaon" }],
  "las-pozas-jardin-surrealista":   [{ nombre: "Ruta Surrealista",    slug: "ruta-surrealista-edward-james" }],
  "nacimiento-huichihuayan":        [{ nombre: "Ruta Surrealista",    slug: "ruta-surrealista-edward-james" }],
  "xilitla-pueblo-magico":          [{ nombre: "Ruta Surrealista",    slug: "ruta-surrealista-edward-james" }],
  "cascada-el-salto":               [{ nombre: "Cascadas del Meco",   slug: "cascadas-del-meco" }],
  "cascadas-de-micos":              [{ nombre: "Paraíso Escalonado",  slug: "paraiso-escalonado-minas-micos" }],
  "cascadas-minas-viejas":          [{ nombre: "Paraíso Escalonado",  slug: "paraiso-escalonado-minas-micos" }],
  "puente-de-dios-tamasopo":        [{ nombre: "Ruta Acuática",       slug: "ruta-acuatica-puente-de-dios" }],
  "cascadas-de-tamasopo":           [{ nombre: "Ruta Acuática",       slug: "ruta-acuatica-puente-de-dios" }],
  "laguna-media-luna":              [{ nombre: "Descubre el Buceo",   slug: "buceo-media-luna" }],
};
