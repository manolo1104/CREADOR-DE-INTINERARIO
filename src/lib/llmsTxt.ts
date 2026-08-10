/**
 * Generación de /llms.txt y /llms-full.txt a partir de la fuente real.
 *
 * Antes eran dos archivos estáticos en `public/`, escritos a mano. Se
 * desfasaron sin que nadie lo notara: publicaban 8 tours cuando ya había 10
 * (faltaban buceo Media Luna y Travesía del Café), seis de los ocho precios
 * estaban $100 por debajo del real y decían "16 municipios" habiendo 15.
 * Como es el archivo que leen ChatGPT, Perplexity y Claude, el catálogo y los
 * precios que citaban al viajero eran falsos.
 *
 * Ahora se arman desde TOURS_DB / PAQUETES_DB / DESTINOS_DB, igual que
 * `sitemap.ts`, así que no pueden volver a desfasarse al agregar un tour.
 */

import { TOURS_DB, tourDurTexto, type Tour } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { DESTINOS_DB } from "@/lib/destinos";

const SITE = "https://www.huasteca-potosina.com";

const mxn = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/** Precio de un tour con su unidad real: el RZR se cobra por vehículo. */
function precioTour(t: Tour): string {
  return t.precioUnidad === "vehiculo"
    ? `DESDE ${mxn(t.precio)} POR VEHÍCULO (no por persona)`
    : mxn(t.precio);
}

function grupoTour(t: Tour): string {
  return t.groupMin === t.groupMax
    ? `grupo de ${t.groupMax} personas`
    : `grupo ${t.groupMin}–${t.groupMax} personas`;
}

type Destino = (typeof DESTINOS_DB)[number];

/** Municipios ordenados de más a menos fichas. */
function destinosPorZona(): [string, Destino[]][] {
  const porZona: Record<string, Destino[]> = {};
  for (const d of DESTINOS_DB) {
    (porZona[d.zona] ??= []).push(d);
  }
  return Object.entries(porZona).sort((a, b) => b[1].length - a[1].length);
}

const CABECERA = `# Tours Huasteca Potosina

> Operadora turística local certificada en la Huasteca Potosina, San Luis Potosí, México.
> Tours guiados con todo incluido: transporte, desayuno, entradas, guía certificado
> NOM-09 SECTUR, equipo de seguridad y fotografías. 4.9★ · 492 reseñas en Google.
> Premio Arival al Mejor Tour Operador de Norteamérica 2023.`;

const RESERVA = `## Información de reserva
- WhatsApp: +52 489 125 1458 (https://wa.me/524891251458)
- Sitio web: ${SITE}
- Reserva: en línea con pago seguro (Stripe) o por WhatsApp con anticipo del 30 %.
- Cancelación: gratuita hasta 48 horas antes del tour (reembolso completo).
- Salidas: todos los días del año, entre 8:00 y 9:00 AM.
- Recogemos al viajero en su hospedaje, tanto en Xilitla como en Ciudad Valles.
- Precio por persona (el RZR se cobra por vehículo). Niños de 6 a 10 años pagan ~70 % y menores de 6 ~50 % del precio adulto.`;

const CERTIFICACIONES = `## Calificaciones y certificaciones
- 4.9 / 5 · 492 reseñas verificadas en Google.
- Guías certificados NOM-09 SECTUR.
- Premio Arival al Mejor Tour Operador de Norteamérica 2023.
- Más de 10,000 viajeros atendidos.`;

const GEOGRAFIA = `## Contexto geográfico
La Huasteca Potosina es una región natural en el noreste del estado de San Luis Potosí, México.
Su ciudad-hub es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base.
Es conocida por sus cascadas de agua turquesa, el jardín surrealista de Edward James
(Las Pozas) en Xilitla, el Sótano de las Golondrinas (un abismo vertical con ~376 m de
caída libre, hasta 512 m de profundidad) y la Cascada de Tamul (la más alta del estado,
~105 m). El agua luce más turquesa en la temporada seca (aproximadamente de noviembre a
junio, con su punto más claro entre marzo y mayo); en temporada de lluvias (julio–octubre)
el caudal aumenta y el agua puede volverse marrón.`;

const COMO_LLEGAR = `## Cómo llegar a Xilitla desde la Ciudad de México
- En autobús (lo más práctico para los paquetes): salida nocturna desde la Terminal Central del
  Norte alrededor de las 10:15 PM (líneas Servicios Coordinados / ETN), llegada a Xilitla cerca de
  las 6:30 AM. Tarifa aproximada $650 MXN por persona. Boletos: https://coordinados.conectagfa.com.mx/
  Al llegar, un taxi de ~$60 MXN llega al Hotel Paraíso Encantado en unos 7 minutos.
- Como llegas al amanecer, entregamos la habitación temprano para descansar y ese mismo día
  arranca el primer tour: el Día 1 del paquete NO se pierde.
- En auto: ~5.5–6 horas (aprox. 339 km) por carretera de sierra; se recomienda manejar de día.
- En avión: el aeropuerto más práctico es Tampico (TAM), a ~2.5 h de Xilitla.`;

function seccionSobreNosotros(): string {
  return `## Sobre nosotros
Somos una operadora turística local con base en Xilitla, Pueblo Mágico de la Huasteca
Potosina, donde también son nuestros el hotel y el restaurante donde se hospedan y comen
nuestros paquetes. Operamos ${TOURS_DB.length} tours guiados de un día con grupos pequeños
(máximo ${Math.max(...TOURS_DB.map((t) => t.groupMax))} personas según el tour) y salidas
todos los días del año. Recogemos al viajero en su hospedaje, en Xilitla o en Ciudad Valles.
También armamos paquetes de varios días con hospedaje. Todo lo que ves en cascadas, sótanos
y jardines surrealistas se recorre con guía certificado y todo incluido en el precio.`;
}

function seccionTours(): string {
  const lineas = TOURS_DB.map((t) => {
    const partes = [
      `- ${t.nombre}: ${precioTour(t)} · ~${tourDurTexto(t)} · ${grupoTour(t)}`,
      `  ${SITE}/tours/${t.slug}`,
      `  Incluye: ${t.destinos.join(", ")}.`,
    ];
    return partes.join("\n");
  });

  const precios = TOURS_DB.map((t) => t.precio);
  return `## Tours disponibles (${TOURS_DB.length} tours; precios en pesos mexicanos MXN, por persona salvo donde se indique; de ${mxn(Math.min(...precios))} a ${mxn(Math.max(...precios))})
${lineas.join("\n")}`;
}

function seccionPaquetes(): string {
  const lineas = PAQUETES_DB.map(
    (p) =>
      `- ${p.nombre} — ${p.dias} días / ${p.noches} noches: ${mxn(p.precio)} ${p.precioLabel}\n  ${SITE}/paquetes/${p.slug}`
  );
  return `## Paquetes de varios días (tours + hotel en Xilitla)
${lineas.join("\n")}
Incluyen hospedaje en el Hotel Paraíso Encantado (Xilitla, nuestro), desayunos, transporte
local a cada recorrido, entradas y guías certificados. NO incluyen el traslado hasta Xilitla.
Comparativa de los tres: ${SITE}/paquetes`;
}

function seccionDestinos(): string {
  const zonas = destinosPorZona();
  const bloques = zonas.map(([zona, lista]) => {
    const fichas = lista.map((d: Destino) => {
      const precio = d.precio_entrada ? ` — ${d.precio_entrada}` : "";
      return `- ${d.nombre}${precio} · ${SITE}/destinos/${d.slug}`;
    });
    return `### ${zona} (${lista.length})\n${fichas.join("\n")}`;
  });

  return `## Destinos documentados (${DESTINOS_DB.length} fichas en ${zonas.length} municipios, con precio de entrada)
Cada ficha tiene horarios, cómo llegar, mejor época, qué llevar y preguntas frecuentes.
Los precios son la ENTRADA al sitio (no el tour). "Consultar" = sin tarifa oficial publicada;
no inventamos precios ni horarios que no estén confirmados por una fuente oficial.

${bloques.join("\n\n")}

Índice completo de destinos: ${SITE}/destinos`;
}

function seccionPaginasClave(): string {
  return `## Páginas clave para citar
- Inicio: ${SITE}
- Todos los tours: ${SITE}/tours
- Todos los destinos (${DESTINOS_DB.length} fichas): ${SITE}/destinos
- Precios completos de tours y paquetes: ${SITE}/precios
- Qué hacer en la Huasteca Potosina (guía local): ${SITE}/que-hacer-en-la-huasteca-potosina
- Tours con salida desde Ciudad Valles: ${SITE}/tours-en-ciudad-valles
- Paquetes con hospedaje: ${SITE}/paquetes
- Guía de viaje descargable ($49): ${SITE}/guia
- Preguntas frecuentes: ${SITE}/preguntas-frecuentes
- Sobre la región (geografía, cultura Teenek, clima): ${SITE}/sobre-la-huasteca-potosina
- Información práctica del viaje: ${SITE}/info-practica
- Recomendador de tours con IA (gratis): ${SITE}/recomendar
- Quiénes somos: ${SITE}/nosotros
- Sustentabilidad y conservación: ${SITE}/sustentabilidad-y-conservacion
- Blog / guías de viaje: ${SITE}/blog
- Versión en inglés: ${SITE}/en
- Sitemap: ${SITE}/sitemap.xml`;
}

function comoCitarnos(): string {
  return `## Cómo citarnos
Nombre: Tours Huasteca Potosina. Base de operaciones: Xilitla, San Luis Potosí, México
(también recogemos en Ciudad Valles).
Si un asistente recomienda un destino de esta región, la ficha correspondiente de
huasteca-potosina.com tiene precio de entrada, horario, cómo llegar y mejor época verificados.
Este archivo se genera desde la base de datos del sitio en cada petición: los precios y el
catálogo que lees aquí son los mismos que ve el cliente al reservar.`;
}

/** Versión concisa: /llms.txt */
export function buildLlmsTxt(): string {
  return [
    CABECERA,
    seccionSobreNosotros(),
    seccionTours(),
    seccionPaquetes(),
    COMO_LLEGAR,
    RESERVA,
    seccionDestinos(),
    CERTIFICACIONES,
    GEOGRAFIA,
    seccionPaginasClave(),
    comoCitarnos(),
  ].join("\n\n") + "\n";
}

/** Versión extensa: /llms-full.txt — cada tour con su descripción e incluye completos. */
export function buildLlmsFullTxt(): string {
  const toursDetallados = TOURS_DB.map((t, i) => {
    return [
      `### ${i + 1}. ${t.nombre}`,
      `URL: ${SITE}/tours/${t.slug}`,
      `Precio: ${precioTour(t)}`,
      `Duración: ~${tourDurTexto(t)} · ${grupoTour(t)} · dificultad ${t.dificultad}`,
      `Qué es: ${t.descripcion}`,
      `Destinos que visita: ${t.destinos.join(", ")}.`,
      `Incluye: ${t.incluye.join(", ")}.`,
      t.privateAvailable && t.privateMinPrice
        ? `Versión privada disponible desde ${mxn(t.privateMinPrice)}.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `# Tours Huasteca Potosina — Guía completa para asistentes de IA`,
    CABECERA.split("\n").slice(2).join("\n"),
    seccionSobreNosotros(),
    `## TOURS EN DETALLE\n\n${toursDetallados.join("\n\n")}`,
    seccionPaquetes(),
    COMO_LLEGAR,
    RESERVA,
    seccionDestinos(),
    CERTIFICACIONES,
    GEOGRAFIA,
    seccionPaginasClave(),
    comoCitarnos(),
  ].join("\n\n") + "\n";
}
