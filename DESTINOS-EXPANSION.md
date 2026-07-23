# Expansión de /destinos — Huasteca Potosina (actualizado 21 jul 2026)

Documento para Manolo. Resume qué se hizo, con qué fuentes, el estado de las imágenes y qué falta para publicar.
**Regla aplicada:** ningún dato se inventó. Donde un precio/horario no está publicado por fuente oficial, se escribió "Acceso libre", "Sin tarifa oficial publicada" o "Consultar", y se marcó en la ficha.

---

## 1. Resumen

- **Antes (en producción hoy):** 20 destinos agrupados por tipo. **Este lote:** **41 destinos en 16 municipios**, agrupados por MUNICIPIO.
- Recorrido del lote: +21 de la expansión de junio, +4 nuevos de Xilitla (La Trinidad, Olla de la Luz, Cueva del Salitre, Museo Leonora Carrington), −4 borrados a pedido tuyo (Trajineras del Río Valles, Cuevas Sagradas de Huehuetlán, Kiosco de Tampamolón, Playas del Sol), y Huichihuayán movido de Huehuetlán a **Xilitla** (tu decisión del 29 jun).
- Todos con fuente confiable: turismo estatal, gob.mx / Pueblos Mágicos, **INAH**, **SEGAM**, Secretaría de Cultura (SIC), sitios municipales `.gob.mx` y referencias establecidas.
- Los 41 tienen **narrativa** ("lo mejor del lugar") y los 41 tienen **imagen** (ver §4).
- TypeScript sin errores; verificado en localhost.

---

## 2. Correcciones a datos que YA estaban en producción (importantes)

| Destino | Antes | Ahora (verificado) | Fuente |
|---|---|---|---|
| **Tamtoc** | "Martes a Domingo", $95 | **SOLO domingos** 9–18 h; gratis domingos (mexicanos). Reabrió tras lluvias 2024 | INAH (zonas/115 + boletín) |
| **Cascada El Aguacate** | Municipio **Aquismón** | Municipio **Tamasopo** (la de ~75 m, 2ª más alta); coords corregidas | México Desconocido, Milenio |
| **Sótano de las Golondrinas** | "333 m" | **376 m de caída libre (hasta 512 m)** | Wikipedia / fuentes estándar |
| **Laguna de la Media Luna** | "termal 27–29°C, 30 m, vestigios" | **Aguas frescas y cristalinas** (corrección tuya del 10 jul; el hunk ya se pusheó a prod por separado) | Tú |

(Corregido en español **e inglés** y en la narrativa.)

---

## 3. Lista completa de destinos por municipio (41 en 16 municipios)

✅ = foto real del lugar · 🖼 = imagen representativa temporal (ver §8) · ⭐ = ancla (perfil completo con SEO/FAQ)

**Xilitla (8)** — Las Pozas ✅⭐ · Xilitla Pueblo Mágico ✅ · Nacimiento de Huichihuayán ✅ · Cascada Los Comales 🖼⭐ · La Trinidad ✅(galería baja-res) · Olla de la Luz ✅(galería) · Cueva del Salitre ✅(galería) · Museo Leonora Carrington ✅(galería, fotos SIC)
**Aquismón (8)** — Cascada de Tamul ✅ · Sótano de las Golondrinas ✅(baja-res) · Sótano de las Huahuas ✅ · Cuevas de Mantetzulel ✅ · Nacimiento de Tambaque ✅(baja-res) · Río Tampaón (rafting) ✅ · Aquismón Pueblo Mágico ✅⭐ · Cueva del Agua 🖼
**Tamasopo (4)** — Cascadas de Tamasopo ✅ · Puente de Dios ✅ · Cascada El Aguacate ✅ · El Trampolín ✅
**Ciudad Valles (2)** — Cascadas de Micos ✅ · Balneario Taninul ✅
**El Naranjo (3)** — Cascada El Salto ✅ · Cascada El Meco ✅ · Cascadas de Minas Viejas ✅
**Coxcatlán (3)** — Templo de San Juan Bautista ✅ · Cascada El Zapote "Poza Azul" 🖼 · Ruinas de El Jopoy 🖼
**Tamuín (2)** — Zona Arqueológica Tamtoc ✅ · Zona Arqueológica Tamohí / El Consuelo ✅⭐
**Axtla de Terrazas (2)** — Castillo de la Salud "Beto Ramón" ✅⭐ · Río Axtla "el Chalán" 🖼
**Tancanhuitz (2)** — Voladores de Tamaletón ✅ · Tancanhuitz (149 Escalones / Xantolo) 🖼
**Tamazunchale (1)** — Cascadas de Tilapa 🖼
**San Martín Chalchicuautla (1)** — Cuna del Xantolo 🖼
**San Vicente Tancuayalab (1)** — San Vicente Tancuayalab 🖼
**Tanlajás (1)** — Toreada de los Diablos 🖼
**Matlapa (1)** — Texquitote (cuna del son huasteco) 🖼
**Ébano (1)** — Laguna de los Suspiros 🖼
**Rioverde** *(cercanías, fuera de la Huasteca)* **(1)** — Laguna de la Media Luna ✅

Borrados de este lote (decisión tuya, 29 jun): Trajineras del Río Valles, Cuevas Sagradas del Viento y la Fertilidad, Kiosco "Belga" de Tampamolón, Playas del Sol. Sus fotos quedaron respaldadas en `backups-imagenes/` (fuera de `public/`, no se despliegan).

---

## 4. 📷 Estado de las imágenes

- **Los 41 destinos tienen imagen.** 12 llevan **imagen representativa** (foto libre del TIPO de lugar, NO del sitio exacto — lista en §8), marcada como temporal. Cuando mandes tu **foto real** (horizontal, mín. 1600 px), la cambio al instante.
- **(21 jul) Compresión hecha (checklist de la auditoría):** todos los heros nuevos/reemplazados se bajaron a máx. 2000 px y ~300–570 KB (el de Huahuas pesaba 6.4 MB a 5472 px; el de Tamohí venía escalado y se regresó a 1000 px reales). Los previews de WhatsApp/OG ya no deberían fallar por peso.
- **Backups fuera de `public/`:** los originales de Río Tampaón y Huahuas (baja-res viejos) y las carpetas de los 4 destinos borrados están en `backups-imagenes/` (ignorado por git).
- **Siguen en baja resolución sin mejor opción libre** (ideal tu foto): Sótano de las Golondrinas (800px), Nacimiento de Tambaque (902px), galería de La Trinidad/Olla de la Luz/Cueva del Salitre (~380–590px; se muestran en galería chica a propósito, se ven bien).

---

## 5. Créditos de imágenes (Wikimedia Commons — licencia CC)

✅ **(21 jul) Página `/creditos` CREADA** (`src/app/creditos/page.tsx`): tabla completa de atribución CC + nota de las fotos de sitios oficiales/SIC, enlazada desde el footer del home y en el sitemap. La tabla vive en esa página; este es el resumen:

| Destino | Autor | Licencia |
|---|---|---|
| Aquismón (Parroquia San Miguel) | Patricia Alzuarte Díaz | CC BY-SA 3.0 |
| Tamohí / El Consuelo | Ricardosanluis | CC BY-SA 3.0 |
| Templo San Juan Bautista (Coxcatlán) | Patricia Alzuarte Díaz | CC BY-SA 3.0 |
| Sótano de las Huahuas | panza.rayada (Panoramio) | CC BY-SA 3.0 |
| Río Tampaón | Comisión Mexicana de Filmaciones (F. Uriegas) | CC BY-SA 2.0 |
| Cascada El Trampolín (Tamasopo) | Juan Carlos Fonseca Mata | CC BY-SA 4.0 |
| Cueva del Agua (representativa) | GreenMeansGo | CC BY-SA 4.0 |
| Cascada Los Comales (representativa) | Pintsmasher | CC BY 3.0 |
| Tancanhuitz (representativa) | Diego Delso | CC BY-SA |
| San Martín Chalchicuautla (representativa) | Zahira Arias | CC BY-SA 4.0 |
| San Vicente Tancuayalab (representativa) | Oscaraleman2018 | CC BY-SA 4.0 |
| Tanlajás (representativa) | AlejandroLinaresGarcia | CC BY-SA 4.0 |
| Texquitote (representativa, CC0) | Wikimedia Commons | CC0 |

*(Las representativas de Pexels/Unsplash NO requieren crédito: Río Axtla, Cascada El Zapote, Cascadas de Tilapa, Laguna de los Suspiros, Ruinas de El Jopoy.)*

---

## 6. Descartados a propósito (con motivo)

- **Mirador de Cristal de Tamazunchale** — clausurado parcialmente por Protección Civil (feb 2025), sin confirmación de reapertura.
- **Río Gallinas** — redundante con la Cascada de Tamul (es el río que la forma).
- **12 sitios "no verificados"** (p. ej. "Cascada de Tamapatz", pozas de Matlapa/Tampacán, Gruta de los Cuatro Vientos) — mencionados en blogs pero sin fuente oficial.
- **Los 4 borrados del 29 jun** (Trajineras, Cuevas Sagradas, Kiosco, Playas del Sol) — decisión tuya.

---

## 7. Checklist pre-push de la auditoría (10 jul) — estado al 21 jul

| # | Punto | Estado |
|---|---|---|
| 1 | Corregir Media Luna primero | ✅ HECHO y ya EN PROD (push selectivo 5e37e6b) |
| 2 | Comprimir heros pesados (≤~500KB) | ✅ HECHO (§4) |
| 3 | Actualizar este documento | ✅ HECHO (este archivo) |
| 4 | Borrar carpetas de fotos huérfanas de los 4 borrados | ✅ Movidas a `backups-imagenes/` |
| 5 | Página `/creditos` (atribución CC) | ✅ CREADA + footer + sitemap |
| 6 | Fallback `imagen_galeria[0]` para OG/JSON-LD en destinos sin hero | ✅ HECHO (`destinos/[slug]/page.tsx` + `jsonld.ts`) |
| 7 | `isAccessibleForFree` contradictorio en gratuitos | ✅ HECHO (ahora refleja "Acceso libre/gratis"; sin `Offer` cuando la tarifa es "Consultar") |
| 8 | Sacar backups de `public/` | ✅ HECHO (`backups-imagenes/`, en .gitignore) |
| 9 | Coords El Aguacate a 2 decimales + 3 de Coxcatlán idénticas | ⏸️ PENDIENTE MENOR — no invento coords; si tienes el punto exacto (pin de Google Maps), lo afinamos |
| 10 | Fichas ligeras EN mezclan idiomas | ⏸️ ACEPTADO — completar después |

## 8. Imágenes REPRESENTATIVAS aún colocadas (12) — reemplázalas con tu foto real

| Destino | Imagen representativa | Fuente |
|---|---|---|
| Cueva del Agua | Cenote turquesa | Wikimedia CC |
| Río Axtla "el Chalán" | Río verde con canoa | Unsplash |
| Cascada El Zapote (Coxcatlán) | Cascada en poza turquesa | Pexels |
| Cascadas de Tilapa | Cascada tropical | Pexels |
| Cascada Los Comales | Cascadas gemelas turquesa | Wikimedia CC |
| Laguna de los Suspiros | Laguna con raíces | Pexels |
| Ruinas de El Jopoy | Ruinas de piedra con arcos | Pexels |
| Tancanhuitz | Interior de iglesia colonial | Wikimedia CC |
| San Martín Chalchicuautla | Danzantes de Xantolo | Wikimedia CC |
| San Vicente Tancuayalab | Iglesia colonial | Wikimedia CC |
| Tanlajás | Máscaras de Xantolo (mexicanas) | Wikimedia CC |
| Texquitote | Instrumentos del son huasteco | Wikimedia CC0 |

➡️ **Mándame tu foto diciendo a qué destino va y la cambio al instante.** (Para Golondrinas, Tambaque y las galerías de los 4 de Xilitla también conviene mejor resolución cuando la tengas.)

---

## 9. Qué falta para PUBLICAR este lote

1. **Tus fotos reales** de los 12 destinos con imagen representativa (§8) — o tu OK para publicar con las temporales y cambiarlas sobre la marcha.
2. **Tu OK explícito para el push a `main`** (= producción Railway). El lote incluye: `destinos.ts`, `destinos.en.ts`, `destinoData.ts`, `DestinosClient.tsx`, `DestinoProductCard.tsx`, `destinos/[slug]/page.tsx`, `jsonld.ts`, `sitemap.ts`, `page.tsx` (link footer), `creditos/page.tsx`, este doc y ~25 carpetas de imágenes.
3. Después del push: pedir indexación de `/destinos` y algunas fichas nuevas en Search Console, y avisar para re-verificar los previews de WhatsApp (OG).
