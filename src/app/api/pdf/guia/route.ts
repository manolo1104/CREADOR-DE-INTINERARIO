import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Verifica pago y sirve el PDF como HTML imprimible
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id requerido" }, { status: 400 });
  }

  // Verificar pago con Stripe
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pago no completado" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
  }

  logger.info("pdf_download", { session_id: sessionId });

  const html = buildGuiaHtml();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Guia-Huasteca-Potosina-2026.html"',
    },
  });
}

function buildGuiaHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Guía Huasteca Potosina 2026</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.7; }
  h1, h2, h3, h4 { font-family: 'Cormorant Garamond', serif; font-weight: 300; }
  .cover { background: #0a1f0e; color: #f5f0e8; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px 40px; page-break-after: always; }
  .cover h1 { font-size: 64px; line-height: 1; margin-bottom: 16px; }
  .cover h1 em { color: #c9a84c; font-style: italic; }
  .cover .subtitle { font-size: 18px; color: rgba(245,240,232,0.6); font-style: italic; max-width: 500px; margin: 0 auto 40px; }
  .cover .badge { border: 1px solid rgba(245,240,232,0.2); padding: 8px 20px; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: rgba(245,240,232,0.5); display: inline-block; margin-bottom: 24px; }
  .cover .url { color: #7ec96e; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 60px; }
  section { padding: 48px 64px; max-width: 800px; margin: 0 auto; }
  section + section { border-top: 1px solid #e8e0d5; }
  .section-label { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #2d6a2d; margin-bottom: 12px; }
  h2 { font-size: 36px; color: #1a1a1a; margin-bottom: 20px; }
  h2 em { color: #c9a84c; }
  h3 { font-size: 24px; color: #1a1a1a; margin-bottom: 12px; margin-top: 32px; }
  p { margin-bottom: 16px; color: #333; }
  ul { padding-left: 20px; margin-bottom: 16px; }
  ul li { margin-bottom: 8px; color: #333; }
  .destino-card { border: 1px solid #e0d9cc; padding: 28px; margin-bottom: 24px; background: #faf9f6; break-inside: avoid; }
  .destino-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
  .destino-emoji { font-size: 36px; }
  .destino-meta { flex: 1; }
  .destino-nombre { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; line-height: 1; margin-bottom: 4px; }
  .destino-zona { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #2d6a2d; }
  .ficha { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
  .ficha-item { background: #fff; border: 1px solid #e8e0d5; padding: 10px 14px; }
  .ficha-label { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 2px; }
  .ficha-val { font-size: 12px; font-weight: 500; color: #1a1a1a; }
  .advertencia { border-left: 3px solid #c44; background: #fff5f5; padding: 12px 16px; margin-bottom: 12px; font-size: 12px; color: #722; }
  .consejo { border-left: 3px solid #2d6a2d; background: #f5faf5; padding: 12px 16px; margin-bottom: 12px; font-size: 12px; color: #1a3d1a; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
  th { background: #0a1f0e; color: #f5f0e8; padding: 10px 14px; text-align: left; font-weight: 400; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  td { padding: 10px 14px; border-bottom: 1px solid #e8e0d5; }
  tr:nth-child(even) td { background: #faf9f6; }
  .checklist { columns: 2; gap: 32px; }
  .checklist li { break-inside: avoid; margin-bottom: 10px; display: flex; gap: 8px; list-style: none; align-items: flex-start; }
  .checklist li::before { content: '☐'; color: #2d6a2d; font-size: 14px; flex-shrink: 0; }
  .itinerario-dia { border: 1px solid #e0d9cc; padding: 20px 24px; margin-bottom: 16px; break-inside: avoid; }
  .dia-header { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 300; color: #c9a84c; margin-bottom: 12px; }
  .cta-box { background: #0a1f0e; color: #f5f0e8; padding: 40px; text-align: center; margin: 40px 0; }
  .cta-box h3 { color: #f5f0e8; font-size: 28px; margin-bottom: 12px; }
  .cta-box p { color: rgba(245,240,232,0.6); font-size: 13px; margin-bottom: 20px; }
  .cta-box .url { color: #c9a84c; font-size: 14px; letter-spacing: 2px; }
  @media print {
    body { font-size: 11px; }
    .cover { min-height: auto; }
    section { padding: 32px 48px; }
  }
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <p class="badge">✦ Edición 2026 · Versión Digital</p>
  <h1>Guía Huasteca<br/>Potosina <em>2026</em></h1>
  <p class="subtitle">La guía que sí funciona — escrita como si un amigo local te la diera</p>
  <p style="color:rgba(245,240,232,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:24px">8 Destinos · 3 Itinerarios · Precios Reales · Tips Insider</p>
  <p class="url">HuastecaPotosina.mx</p>
</div>

<!-- SECCIÓN 1: LO QUE NADIE TE DICE -->
<section>
  <p class="section-label">Antes de empacar</p>
  <h2>Lo que nadie te <em>dice</em></h2>
  <p>La Huasteca Potosina es una de las regiones más hermosas de México, pero también una de las que más sorprende a quienes llegan sin información real. Aquí van las cinco verdades que te van a ahorrar tiempo, dinero y dolores de cabeza:</p>

  <h3>1. El efectivo es tu mejor amigo</h3>
  <p>La gran mayoría de los sitios naturales, lanchas, guías y comedores en zona rural <strong>solo aceptan efectivo en pesos mexicanos</strong>. En Ciudad Valles hay cajeros automáticos — saca suficiente antes de salir. No hay cajeros en Tanchachín, en la entrada al Sótano de Golondrinas ni en muchas cascadas secundarias. Un estimado seguro: $1,500–2,500 MXN por persona por día de actividades intensas.</p>

  <h3>2. Los horarios del cartel mienten (a veces)</h3>
  <p>Los horarios oficiales dicen "8:00–17:00" pero los lancheros de Tamul dejan de salir a las 2 PM, el Sótano de Golondrinas tiene su espectáculo de vencejos a las 5:45 AM y Las Pozas de Xilitla conviene recorrerlas antes de las 11:00. Esta guía tiene los horarios reales de cada destino.</p>

  <h3>3. El calor es literal — y en verano es extremo</h3>
  <p>De mayo a octubre las temperaturas en zona baja (Tamul, Micos, Taninul) pueden superar 40°C con humedad alta. No es "calorcito": es agotador si no estás preparado. Lleva agua abundante (mínimo 2L por persona por salida), sal en tabletas si eres propenso a calambres y planea las actividades de esfuerzo para temprano en la mañana.</p>

  <h3>4. El bloqueador biodegradable no es opcional</h3>
  <p>En las pozas y cascadas de agua cristalina está <strong>prohibido el bloqueador solar convencional</strong>. Los filtros UV de los bloqueadores químicos no se degradan y destruyen el ecosistema acuático. Tienes que llevar bloqueador mineral o etiquetado "biodegradable". Si no llevas, en la entrada te piden que no entres al agua — o te lo retiran. Marcas como Sun Zapper, Baby Ganics o Mexitan son comunes en Ciudad Valles.</p>

  <h3>5. Los caminos de acceso no son para todos los coches</h3>
  <p>El acceso al Sótano de Golondrinas es por sierra con tramos de terracería. La ruta a algunas cascadas menores requiere doble tracción en temporada de lluvias. Un Jetta estándar llega sin problema a Tamul, Micos, Xilitla y Tamasopo. Para zonas más remotas, considera rentar una camioneta o contratar un tour local con transporte incluido.</p>
</section>

<!-- SECCIÓN 2: CÓMO LLEGAR -->
<section>
  <p class="section-label">Rutas de acceso</p>
  <h2>Cómo llegar: todas las <em>rutas</em> con precios 2026</h2>

  <table>
    <tr><th>Origen</th><th>Opción</th><th>Duración</th><th>Costo aprox.</th><th>Recomendación</th></tr>
    <tr><td>CDMX</td><td>Autobús ADO/Primera Plus nocturno</td><td>9–10 h</td><td>$500–700 MXN</td><td>✓ Mejor opción económica</td></tr>
    <tr><td>CDMX</td><td>Vuelo a Tampico + carretera</td><td>2.5 h vuelo + 2 h</td><td>$1,800–3,500 MXN</td><td>Si tienes poco tiempo</td></tr>
    <tr><td>CDMX</td><td>Carretera propia (MEX-85)</td><td>9–10 h</td><td>$600–900 MXN (gasolina)</td><td>Más libertad, cansado solo</td></tr>
    <tr><td>Monterrey</td><td>Carretera MEX-80 vía Linares</td><td>5.5–6.5 h</td><td>$550–750 MXN (gasolina)</td><td>✓ Ruta más directa del norte</td></tr>
    <tr><td>Monterrey</td><td>Autobús directo a Valles</td><td>6–7 h</td><td>$380–500 MXN</td><td>Opción si no rentas auto</td></tr>
    <tr><td>Guadalajara</td><td>Carretera vía SLP</td><td>7–8 h</td><td>$700–950 MXN (gasolina)</td><td>Considerar parar en SLP capital</td></tr>
    <tr><td>Tampico</td><td>Carretera MEX-70</td><td>2–2.5 h</td><td>$200–250 MXN (gasolina)</td><td>✓ Puerta de entrada norte</td></tr>
  </table>

  <div class="consejo">
    <strong>Consejo:</strong> El autobús nocturno de CDMX es la elección inteligente para viajeros solos o en pareja que no necesitan coche. Llegas a las 7 AM, desayunas en Valles y ya estás listo para salir. La desventaja es que necesitarás taxis o combis locales para los destinos, lo que suma costos pero se compensa con el precio del bus vs. gasolina + peajes.
  </div>
</section>

<!-- SECCIÓN 3: BASE DE OPERACIONES -->
<section>
  <p class="section-label">Hub de viaje</p>
  <h2>Ciudad Valles: tu <em>base</em> de operaciones</h2>
  <p>Ciudad Valles es el punto de partida para el 90% de los visitantes de la Huasteca. No es una ciudad turística glamurosa, pero tiene todo lo que necesitas: cajeros, supermercados, farmacias, gasolineras, hospedaje en todos los rangos y buena conexión por carretera a los destinos principales.</p>

  <h3>Dónde quedarse</h3>
  <table>
    <tr><th>Rango</th><th>Opción</th><th>Precio/noche</th><th>Características</th></tr>
    <tr><td>Económico</td><td>Hostales en el centro</td><td>$250–400 MXN</td><td>Lockers, wifi, comunal</td></tr>
    <tr><td>Medio</td><td>Hotel Valles / Hotel Taninul</td><td>$600–1,200 MXN</td><td>AC, desayuno, estacionamiento</td></tr>
    <tr><td>Con comodidad</td><td>Hotel Hacienda (Taninul)</td><td>$1,500–2,500 MXN</td><td>Alberca termal, jardín, buffet</td></tr>
  </table>

  <h3>Dónde comer bien y barato</h3>
  <p>El mercado municipal de Valles tiene los desayunos más económicos y auténticos. Para comer, busca los fondas locales alrededor del zócalo — enchiladas huastecas, zacahuil (tamal gigante de horno de tierra) y bocoles son los platos que no puedes dejar pasar. Presupuesto comida completa: $80–150 MXN por persona.</p>

  <h3>Renta de transporte</h3>
  <p>Tener coche propio o rentado marca una diferencia enorme. Con transporte propio puedes llegar a los destinos en el horario exacto que esta guía recomienda (madrugada al Sótano, temprano a Tamul). Renta de auto en Valles: desde $600–900 MXN/día. Moto: $300–400 MXN/día para 1–2 personas.</p>
</section>

<!-- SECCIÓN 4: LOS 8 DESTINOS -->
<section>
  <p class="section-label">Destinos principales</p>
  <h2>Los 8 destinos <em>esenciales</em></h2>

  <!-- TAMUL -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🌈</div>
      <div class="destino-meta">
        <div class="destino-nombre">Cascada de Tamul</div>
        <div class="destino-zona">Aquismón · Aventura</div>
      </div>
    </div>
    <p>La cascada más alta de San Luis Potosí — 105 metros de caída libre en agua que cambia de verde a turquesa según la temporada. El acceso no es por tierra: llegas remando 45 minutos por el río Tampaón en lancha (panga). El momento en que la cascada aparece doblando el río es uno de los más fotogénicos de la región.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$220 MXN + $300 panga/p</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">08:00–17:00 (lancheros hasta 14:00)</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">5 horas totales</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Enero–Abril (agua turquesa)</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Alta (remo + caminata)</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">45 min → Tanchachín + lancha</div></div>
    </div>
    <div class="advertencia">⚠️ Los lancheros dejan de salir a las 14:00. Si llegas tarde, no hay salida. Solo efectivo — no hay cajero en Tanchachín.</div>
    <div class="consejo">💡 Tip insider: En octubre la caída de agua tiene coloración turquesa intensa más el follaje naranja de los árboles ribereños. Combinación fotográfica única que pocos conocen.</div>
    <p><strong>Qué llevar:</strong> Chaleco salvavidas (lo incluye la lancha), aqua shoes o calzado cerrado que se moje, agua 2L mínimo, efectivo, protector solar biodegradable, chamarra ligera (el río tiene viento).</p>
  </div>

  <!-- LAS POZAS -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🏛️</div>
      <div class="destino-meta">
        <div class="destino-nombre">Las Pozas — Jardín Surrealista de Xilitla</div>
        <div class="destino-zona">Xilitla · Arte & Naturaleza</div>
      </div>
    </div>
    <p>El excéntrico poeta inglés Edward James construyó entre 1949 y 1984 un laberinto de estructuras de concreto entre cascadas y selva tropical en las montañas de la Sierra Madre Oriental. Columnas que no sostienen nada, escaleras que terminan en el cielo, flores de concreto del tamaño de una casa. Es el lugar más surrealista de México y no hay nada comparable en el continente.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$180 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">09:00–18:00 (cerrado martes)</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">4 horas</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Noviembre–Marzo</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Media (muchos escalones)</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">1h 45min en coche</div></div>
    </div>
    <div class="advertencia">⚠️ Comprar tickets en línea antes de ir — en temporada alta se agotan. Cerrado todos los martes.</div>
    <div class="consejo">💡 Llega en la apertura (09:00). A las 11:00 ya hay grupos y la magia de tener el jardín casi solo desaparece. La luz matinal entre la selva es impresionante para fotografía.</div>
  </div>

  <!-- SÓTANO -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🐦</div>
      <div class="destino-meta">
        <div class="destino-nombre">Sótano de las Golondrinas</div>
        <div class="destino-zona">Aquismón · Extrema</div>
      </div>
    </div>
    <p>Una grieta en la tierra de 333 metros de profundidad — equivalente a tres campos de fútbol puestos verticalmente. Cada amanecer, entre 10,000 y 15,000 vencejos (no golondrinas — el nombre es incorrecto pero ya quedó) salen en espiral del abismo durante 20–30 minutos. Verlo desde el borde al amanecer es una experiencia que no se olvida.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$100 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">06:00–18:00</div></div>
      <div class="ficha-item"><div class="ficha-label">Espectáculo aves</div><div class="ficha-val">05:45–06:30 AM</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Noviembre–Marzo</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Media (568 escalones si bajas)</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">1h 15min por sierra</div></div>
    </div>
    <div class="advertencia">⚠️ Si llegas a las 9 AM, las aves ya salieron. El espectáculo es exclusivamente al amanecer. La subida de regreso si bajas al fondo es AGOTADORA.</div>
    <div class="consejo">💡 Sale de Valles a las 04:30 AM para llegar al borde a las 05:45. Lleva chamarra — la sierra está fría antes del amanecer aunque sea temporada de calor. El vuelo de los vencejos dura ~20 minutos y luego se dispersan.</div>
  </div>

  <!-- MICOS -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">💦</div>
      <div class="destino-meta">
        <div class="destino-nombre">Cascadas de Micos</div>
        <div class="destino-zona">Ciudad Valles · Aventura</div>
      </div>
    </div>
    <p>La más accesible y versátil de las cascadas — 7 caídas de agua con un circuito de actividades: saltos al agua de 3 y 8 metros, tirolesa sobre el río, kayak y skybike. El precio de entrada incluye el circuito básico; las actividades extremas se pagan aparte pero son económicas.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$100 MXN (básico)</div></div>
      <div class="ficha-item"><div class="ficha-label">Actividades extra</div><div class="ficha-val">Tirolesa $100 · Kayak $80/hr</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">08:00–18:00</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">4 horas</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Media</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">20 min (combi $35 c/30min)</div></div>
    </div>
    <div class="advertencia">⚠️ Chaleco y casco son obligatorios para el circuito. No se negocian.</div>
    <div class="consejo">💡 Es el destino perfecto para el primer día — está cerca de Valles, las actividades son variadas y el nivel de esfuerzo es manejable. Ideal para grupos mixtos o familias con adolescentes.</div>
  </div>

  <!-- PUENTE DE DIOS -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🌀</div>
      <div class="destino-meta">
        <div class="destino-nombre">Puente de Dios — Tamasopo</div>
        <div class="destino-zona">Tamasopo · Naturaleza</div>
      </div>
    </div>
    <p>Una cueva por la que pasa un río de color azul cobalto. Entre las 11:00 y las 13:00, un rayo de luz solar entra por la abertura superior e ilumina el agua desde adentro, creando un efecto de cristal azul eléctrico que pocas formaciones naturales en México pueden igualar.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$150 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario ideal</div><div class="ficha-val">11:00–13:00 (luz dentro)</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">3.5 horas</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Enero–Mayo</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Media (piedras resbalosas)</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">1 hora por autopista a SLP</div></div>
    </div>
    <div class="advertencia">⚠️ Las piedras dentro de la cueva son EXTREMADAMENTE resbalosas. Aqua shoes son obligatorios — no opcionales. Hay corrientes fuertes; seguir siempre la cuerda de seguridad.</div>
    <div class="consejo">💡 Combina este destino con las Cascadas de Tamasopo que están a 5 minutos. Llega al Puente a las 10:45 para estar dentro cuando llegue la luz, luego ve a Tamasopo para el almuerzo y nado.</div>
  </div>

  <!-- TAMASOPO -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🏊</div>
      <div class="destino-meta">
        <div class="destino-nombre">Cascadas de Tamasopo</div>
        <div class="destino-zona">Tamasopo · Naturaleza</div>
      </div>
    </div>
    <p>Pozas de agua azul turquesa con cascadas de diferentes alturas — perfectas para nadar. Es el destino más familiar y tranquilo de la región. El agua es cristalina y las pozas tienen diferentes profundidades, desde las que pueden usar los niños hasta las de adultos.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$60 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">08:00–17:00</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">4 horas</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Noviembre–Mayo</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Baja</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">45 min por autopista</div></div>
    </div>
    <div class="advertencia">⚠️ Solo bloqueador solar biodegradable — sin excepción. Te lo retiran en la entrada si llevas el convencional.</div>
  </div>

  <!-- TAMTOC -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">🗿</div>
      <div class="destino-meta">
        <div class="destino-nombre">Zona Arqueológica Tamtoc</div>
        <div class="destino-zona">Tamuín · Arqueología</div>
      </div>
    </div>
    <p>El asentamiento prehispánico más importante de la cultura Huasteca. El Monumento 32 — una estela de piedra que pesa 30 toneladas y representa a la Señora de Tamtoc — es considerado una de las esculturas prehispánicas más importantes de México y está aquí, sin mucho protocolo ni multitudes.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$95 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">09:00–17:00 (martes–domingo)</div></div>
      <div class="ficha-item"><div class="ficha-label">Duración recomendada</div><div class="ficha-val">3 horas</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Diciembre–Febrero</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Baja</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">45 min</div></div>
    </div>
    <div class="advertencia">⚠️ Muy poca sombra. En mayo puede superar 45°C. Ir en temporada fría o muy temprano.</div>
    <div class="consejo">💡 Contrata el guía local disponible en la entrada ($100–150 MXN). Sin guía, las pirámides son montículos de tierra. Con guía, entiendes el cosmos huasteco y el sistema de agua prehispánico que sigue funcionando.</div>
  </div>

  <!-- TANINUL -->
  <div class="destino-card">
    <div class="destino-header">
      <div class="destino-emoji">♨️</div>
      <div class="destino-meta">
        <div class="destino-nombre">Balneario Taninul</div>
        <div class="destino-zona">Ciudad Valles · Bienestar</div>
      </div>
    </div>
    <p>Aguas termales sulfurosas que mantienen 36°C constante todo el año, más piscinas de lodo terapéutico. Es el destino de descanso por excelencia de la región — el complemento perfecto para los días de aventura. El complejo incluye hospedaje de calidad si quieres tener las termas a dos pasos de tu cuarto.</p>
    <div class="ficha">
      <div class="ficha-item"><div class="ficha-label">Precio entrada</div><div class="ficha-val">$150 MXN</div></div>
      <div class="ficha-item"><div class="ficha-label">Horario</div><div class="ficha-val">07:00–20:00</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor hora</div><div class="ficha-val">08:00 o 18:00 (menos gente)</div></div>
      <div class="ficha-item"><div class="ficha-label">Mejor época</div><div class="ficha-val">Diciembre–Enero (contraste termal)</div></div>
      <div class="ficha-item"><div class="ficha-label">Dificultad</div><div class="ficha-val">Baja — accesible para todos</div></div>
      <div class="ficha-item"><div class="ficha-label">Desde Valles</div><div class="ficha-val">15 min</div></div>
    </div>
    <div class="advertencia">⚠️ No llevar joyería de plata — el azufre del agua la oscurece permanentemente.</div>
  </div>
</section>

<!-- SECCIÓN 5: ITINERARIOS -->
<section>
  <p class="section-label">Itinerarios probados</p>
  <h2>3 itinerarios <em>reales</em> (no los genéricos de internet)</h2>

  <h3>Itinerario 3 días — Lo esencial sin matarte</h3>
  <div class="itinerario-dia">
    <div class="dia-header">Día 1 — Llegada y Cascadas de Micos</div>
    <p><strong>06:00–08:00</strong> Llegas a Ciudad Valles (autobús nocturno o vuelo + carretera). Desayuna en el mercado municipal ($60–80 MXN). Saca efectivo.<br/>
    <strong>09:00–14:00</strong> Cascadas de Micos — 20 minutos de Valles. Circuito de cascadas, tirolesa opcional. Come en los comedores del sitio (mariscos, pozole, $80–120 MXN).<br/>
    <strong>15:00–17:00</strong> Regresa a Valles. Checkin al hotel. Pasea el zócalo, cena ligera.<br/>
    <strong>Gasto del día:</strong> $500–800 MXN por persona (transporte + entrada + comidas).</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 2 — Tamul (el día más épico)</div>
    <p><strong>06:00</strong> Sale de Valles hacia Tanchachín.<br/>
    <strong>07:00</strong> Llegas a la comunidad. Negocia con lancheros (no hay precio fijo, ronda $300/persona incluyendo guía).<br/>
    <strong>07:30–10:00</strong> Remo de ida por el río Tampaón. Llegada a Tamul.<br/>
    <strong>10:00–12:30</strong> Tiempo en la cascada — nado cerca (no debajo, es peligroso), fotos, descanso.<br/>
    <strong>12:30–14:30</strong> Remo de regreso.<br/>
    <strong>15:00</strong> Regresa a Valles. Baño largo merecido. Cena en restaurante de la ciudad.<br/>
    <strong>Gasto del día:</strong> $700–1,000 MXN por persona.</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 3 — Tamasopo (Puente de Dios + Cascadas)</div>
    <p><strong>08:00</strong> Sale de Valles por autopista dirección SLP.<br/>
    <strong>09:00</strong> Llegas a Tamasopo. Ve primero al Puente de Dios.<br/>
    <strong>10:45–13:00</strong> Puente de Dios — espera la luz que entra entre 11–13h. El agua se ilumina en azul eléctrico.<br/>
    <strong>13:30–16:00</strong> Cascadas de Tamasopo — nado, descanso, almuerzo en los comedores del sitio.<br/>
    <strong>17:00</strong> Regreso a Valles o salida hacia tu destino final.<br/>
    <strong>Gasto del día:</strong> $400–600 MXN por persona.</p>
  </div>

  <h3>Itinerario 5 días — La experiencia completa</h3>
  <div class="itinerario-dia">
    <div class="dia-header">Día 1 — Llegada + Micos</div>
    <p>Igual que el itinerario de 3 días, Día 1.</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 2 — Sótano de Golondrinas</div>
    <p><strong>04:30</strong> Salida de Valles en coche (1h 15min por sierra).<br/>
    <strong>05:45</strong> Posición en el borde del sótano. Amanecer y vuelo espiral de los vencejos durante 20–30 minutos.<br/>
    <strong>07:00–09:00</strong> Opcional: baja los 568 escalones al fondo (agotador, tarda 45 min abajo + 90 min subida).<br/>
    <strong>11:00</strong> Regresa a Valles. Desayuno tardío. Tarde libre o Taninul termales.<br/>
    <strong>18:00</strong> Taninul al atardecer para las termas sin sol directo.</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 3 — Tamul</div>
    <p>Igual que el itinerario de 3 días, Día 2.</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 4 — Xilitla (Las Pozas)</div>
    <p><strong>07:00</strong> Sale de Valles hacia Xilitla (1h 45min).<br/>
    <strong>09:00–13:00</strong> Las Pozas. Llega en apertura para tener el jardín casi solo las primeras 2 horas.<br/>
    <strong>13:00</strong> Almuerzo en el pueblo de Xilitla (probar el café de altura local y las gorditas de maíz azul).<br/>
    <strong>14:30–17:00</strong> Explora el pueblo mágico de Xilitla — iglesia del siglo XVI, mercado local.<br/>
    <strong>17:00</strong> Regreso a Valles o noche en Xilitla (posadas de $500–800 MXN).</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 5 — Tamasopo + Tamtoc</div>
    <p><strong>08:00–14:00</strong> Puente de Dios + Cascadas de Tamasopo (igual que Día 3 del itinerario corto).<br/>
    <strong>15:30–17:00</strong> Zona Arqueológica Tamtoc (45 min desde Valles, en ruta de regreso desde Tamasopo).<br/>
    <strong>18:00</strong> Llegada a Valles. Cena de despedida.</p>
  </div>

  <h3>Itinerario 7 días — El viaje de tu vida</h3>
  <p>Usa los 5 días anteriores y agrega:</p>
  <div class="itinerario-dia">
    <div class="dia-header">Día 6 — Día de río y descanso</div>
    <p>Alquila kayaks en Valles para explorar el río Verde. Visita el mercado dominical de Aquismón si cae en domingo. Tarde en las termas de Taninul sin prisa.</p>
  </div>
  <div class="itinerario-dia">
    <div class="dia-header">Día 7 — Destinos secundarios o día libre</div>
    <p>Opciones según interés: Cascada Cola de Caballo (Municipio de Tamasopo), Cascada El Salto (Xilitla), Cueva del Agua (Aquismón), o simplemente un día sin agenda en el pueblo o el río.</p>
  </div>
</section>

<!-- SECCIÓN 6: PRESUPUESTO -->
<section>
  <p class="section-label">Finanzas del viaje</p>
  <h2>Presupuesto real por tipo de <em>viajero</em></h2>
  <table>
    <tr><th>Concepto</th><th>Mochilero</th><th>Viajero medio</th><th>Con comodidad</th></tr>
    <tr><td>Hospedaje/noche</td><td>$250–400 MXN</td><td>$600–900 MXN</td><td>$1,200–2,500 MXN</td></tr>
    <tr><td>Comida/día</td><td>$150–200 MXN</td><td>$250–350 MXN</td><td>$400–600 MXN</td></tr>
    <tr><td>Entradas/actividades</td><td>$200–350 MXN</td><td>$350–600 MXN</td><td>$600–1,000 MXN</td></tr>
    <tr><td>Transporte local</td><td>$50–100 MXN</td><td>$150–300 MXN</td><td>$300–500 MXN (auto rentado)</td></tr>
    <tr><td><strong>TOTAL estimado/día</strong></td><td><strong>$650–1,050 MXN</strong></td><td><strong>$1,350–2,150 MXN</strong></td><td><strong>$2,500–4,600 MXN</strong></td></tr>
  </table>
  <p style="font-size:12px;color:#777;margin-top:8px">*Precios estimados 2026 en pesos mexicanos. No incluye transporte de llegada/salida a la región.</p>
</section>

<!-- SECCIÓN 7: SÍ Y NO -->
<section>
  <p class="section-label">Reglas de oro</p>
  <h2>Lo que SÍ y lo que <em>NO</em> en la Huasteca</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
      <h3 style="color:#2d6a2d">✓ Sí</h3>
      <ul>
        <li>Llevar bloqueador biodegradable siempre</li>
        <li>Sacar efectivo en Valles antes de salir</li>
        <li>Llegar temprano (antes de las 9 AM) a todos los destinos</li>
        <li>Contratar guías locales — apoyan a la economía comunitaria</li>
        <li>Probar zacahuil, bocoles y agua de guanábana</li>
        <li>Llevar bolsa para tu basura (muchos sitios no tienen botes)</li>
        <li>Respetar las señales de corrientes y profundidades</li>
        <li>Confirmar horarios antes de salir (especialmente en puentes)</li>
        <li>Llevar ropa que se pueda mojar para las pozas</li>
        <li>Preguntar a los locales — siempre saben más que Google</li>
      </ul>
    </div>
    <div>
      <h3 style="color:#c44">✗ No</h3>
      <ul>
        <li>Usar bloqueador solar convencional en pozas o ríos</li>
        <li>Llegar sin efectivo a zona rural</li>
        <li>Ir al Sótano de Golondrinas después de las 8 AM (el espectáculo terminó)</li>
        <li>Nadar directamente debajo de Tamul (corriente muy fuerte)</li>
        <li>Hacer caminatas solitarias sin avisar a dónde vas</li>
        <li>Llevar joyería de plata a Taninul</li>
        <li>Llegar a Las Pozas sin reservación en temporada alta</li>
        <li>Subir a estructuras de Las Pozas marcadas como prohibidas</li>
        <li>Tirar basura — aunque no haya nadie mirando</li>
        <li>Subestimar el calor de mayo–septiembre</li>
      </ul>
    </div>
  </div>
</section>

<!-- SECCIÓN 8: CHECKLIST -->
<section>
  <p class="section-label">Antes de empacar</p>
  <h2>Checklist de <em>empaque</em></h2>
  <h3>Ropa y equipo</h3>
  <ul class="checklist">
    <li>Aqua shoes o calzado cerrado que se moje</li>
    <li>2–3 cambios de ropa ligera (dry-fit)</li>
    <li>Traje de baño (uno de repuesto)</li>
    <li>Chamarra ligera (para mañanas en la sierra)</li>
    <li>Sombrero o gorra de ala ancha</li>
    <li>Toalla de microfibra</li>
    <li>Mochila impermeable o bolsa seca</li>
    <li>Sandalias para las termas</li>
  </ul>
  <h3>Salud y protección</h3>
  <ul class="checklist">
    <li>Bloqueador solar BIODEGRADABLE (obligatorio)</li>
    <li>Repelente de insectos biodegradable</li>
    <li>Botiquín básico (antiácidos, banditas, analgésicos)</li>
    <li>Sales de rehidratación oral</li>
    <li>Agua — mínimo 2L por persona por salida</li>
    <li>Pastillas potabilizadoras (opcional, por precaución)</li>
  </ul>
  <h3>Dinero y documentos</h3>
  <ul class="checklist">
    <li>Efectivo en pesos mexicanos (mínimo $2,000 MXN/persona)</li>
    <li>Tarjeta bancaria (solo para ciudades)</li>
    <li>Identificación oficial</li>
    <li>Seguro de viaje (muy recomendado para actividades extremas)</li>
    <li>Esta guía descargada en tu celular (modo offline)</li>
  </ul>
</section>

<!-- SECCIÓN 9: GASTRONOMÍA -->
<section>
  <p class="section-label">Cultura y gastronomía</p>
  <h2>Come como un <em>local</em></h2>
  <h3>Platos que no puedes dejar pasar</h3>
  <ul>
    <li><strong>Zacahuil</strong> — El tamal gigante de la Huasteca. Se hace en horno de tierra, puede pesar hasta 50 kilos. La versión individual en hoja de plátano es suficiente para dos personas hambrientas. Encuéntralo en el mercado de Valles los fines de semana.</li>
    <li><strong>Bocoles</strong> — Tortillas gordas de maíz mezcladas con frijoles. El desayuno clásico local. Con nata, queso y salsa verde: perfectas.</li>
    <li><strong>Enchiladas huastecas</strong> — A diferencia de las del centro, aquí van fritas, con queso seco y papa. Diferentes a todo lo que has comido antes.</li>
    <li><strong>Caldo de res huasteco</strong> — Con hierba santa, chile ancho y elote. Cada fonda tiene su versión.</li>
    <li><strong>Agua fresca de guanábana</strong> — La fruta tropical local. Pide la versión natural en cualquier mercado.</li>
    <li><strong>Café de Xilitla</strong> — La sierra produce un café de altura suave y afrutado. Compra en el mercado del pueblo directamente al productor.</li>
  </ul>
</section>

<!-- SECCIÓN 10: EMERGENCIAS -->
<section>
  <p class="section-label">Seguridad</p>
  <h2>Contactos de <em>emergencia</em></h2>
  <table>
    <tr><th>Servicio</th><th>Ubicación</th><th>Contacto</th></tr>
    <tr><td>Cruz Roja Ciudad Valles</td><td>Ciudad Valles</td><td>[DATO PENDIENTE — verificar]</td></tr>
    <tr><td>Hospital General de Valles</td><td>Ciudad Valles</td><td>[DATO PENDIENTE — verificar]</td></tr>
    <tr><td>Protección Civil SLP</td><td>San Luis Potosí</td><td>[DATO PENDIENTE — verificar]</td></tr>
    <tr><td>Policía Municipal Valles</td><td>Ciudad Valles</td><td>[DATO PENDIENTE — verificar]</td></tr>
    <tr><td>Emergencias generales</td><td>Todo México</td><td>911</td></tr>
  </table>
  <p style="font-size:11px;color:#999;margin-top:8px">Completa esta tabla con números verificados antes de salir. La cobertura celular es limitada en zonas remotas — avisa a alguien de tu itinerario antes de salir.</p>
</section>

<!-- CTA FINAL -->
<div class="cta-box">
  <h3>¿Quieres un itinerario personalizado?</h3>
  <p>Esta guía cubre los destinos principales. Para un itinerario creado exactamente para tus fechas, presupuesto y tipo de viaje, usa el planificador IA gratuito.</p>
  <p class="url">HuastecaPotosina.mx/planear</p>
  <p style="font-size:11px;color:rgba(245,240,232,0.3);margin-top:16px">Gratis · Sin registro · Listo en 2 minutos</p>
</div>

<section style="text-align:center;padding:32px;border-top:1px solid #e8e0d5;color:#999;font-size:11px">
  <p>Guía Huasteca Potosina 2026 · HuastecaPotosina.mx</p>
  <p style="margin-top:8px">Este documento se puede imprimir o guardar como PDF desde tu navegador (Ctrl+P → Guardar como PDF)</p>
</section>

</body>
</html>`;
}
