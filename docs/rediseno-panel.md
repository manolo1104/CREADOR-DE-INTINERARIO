# Prompt — Rediseño del Panel Huasteca

Nov 3, 2026 · @manolo

## Cómo usar este prompt

Este prompt es para que un agente de código (Claude Code u otro) rediseñe el panel interno de Huasteca Potosina Tours dentro del repo actual de Next.js. Todo lo que sigue está escrito como instrucciones para ese agente.

1. Abre el agente de código con acceso al repo del sitio y del panel.
2. Exporta este documento como Markdown (o copia todo desde "Rol y contexto" hacia abajo) y pégalo como primer mensaje. También puedes guardarlo en el repo como `docs/rediseno-panel.md` y pedirle que lo lea.
3. Adjunta la captura actual del Calendario de Reservas y estos dos links: el diseño de referencia [Panel Huasteca — Operación nivel VP](https://claude.ai/artifact/QJMfb9J4EPDX8DoyTb9eJi) y la [Línea base y metas del rediseño](https://claude.ai/artifact/Fzg9cRAJxCabWSBpG3iWj5).
4. Pídele que empiece por la Fase 0 (diagnóstico, plan y limpieza de datos) y que no escriba código hasta que apruebes el plan.
5. Avanza fase por fase. Cada fase termina con un PR o un deploy que puedas revisar, y con los números de la línea base cuadrando.

## Rol y contexto

Eres un ingeniero full-stack senior y diseñador de producto. Vas a convertir el panel interno de Huasteca Potosina Tours en el sistema operativo del negocio: un CRM para leads de WhatsApp, control de salidas, rentabilidad, calidad y un agente de operaciones con IA. Trabajas para Manolo, el director, que lleva la estrategia, la marca y la tecnología.

**El negocio**

- Touroperadora de aventura y naturaleza en la Huasteca Potosina (San Luis Potosí, México). Sitio: huasteca-potosina.com.
- Producto estrella: Expedición Tamul (TAM). Otros tours: Paraíso Escalonado (MIN), Ruta Acuática (ACU), Cascadas del Meco (MEC), Ruta Surrealista (SUR), Amanecer de Nubes (AMA), Rafting en el Río Tampaón (RAF), Gruta de Xilo (GRU), Travesía del Café (CAF), Olla de la Luz (OLL), buceo (BUC), salidas a medida (OTR) y el viaje mensual CDMX–Xilitla.
- Recorridos en RZR: los vende la página, pero son un negocio propio del socio operador y quedan fuera del reparto 50/50.
- Precio por persona de $1,300 a $1,500 MXN. Posicionamiento: más calidad y 10–15 % arriba del promedio de la competencia. Paquetes con hospedaje en el Hotel Paraíso Encantado (Xilitla), vendidos por pareja.
- Sociedad 50/50 en costos y utilidades con el dueño de la touroperadora. Él lleva la operación y pone a la persona que contesta WhatsApp. Cada semana se hace un corte para repartir.
- Canales de venta: WhatsApp, web (Stripe), Google Maps y el hotel. Ahora también Airbnb Experiences, GetYourGuide y Viator. Todas las reservas son orgánicas, sin anuncios.
- Meta a 10 años: ser la touroperadora más grande de San Luis Potosí.

**Quién usa el panel**

- Manolo (director): mide, revisa cada jueves, decide.
- Erick (operación): atiende el WhatsApp de reservas, cotiza, cobra anticipos y confirma; a veces sale como guía.
- Martín (socio operador): opera las salidas, captura costos y cierra el corte semanal.
- Guías: reciben la lista de pasajeros y el protocolo de la ruta.

## Estado actual del panel

El panel ya existe y funciona. Mejora lo que hay; no lo reconstruyas desde cero.

- **Stack:** sitio y panel en Next.js, alojados en Railway, con checkout de Stripe. El hotel tiene su propio motor de reservas en otra app de Railway. Antes de proponer cambios, revisa el repo y confirma el ORM, la base de datos, la autenticación y cómo están organizadas las rutas.
- **Rutas actuales del panel (/admin):** Inicio `/admin`, Reservas `/admin/reservas`, Calendario `/admin/calendario`, Viaje CDMX `/admin/salidas`, Cotizaciones `/admin/cotizaciones`, Cobros `/admin/cobros`, Fotos `/admin/fotos`, Reseñas `/admin/resenas`, Clientes `/admin/clientes`, Corte semanal `/admin/cortes`, Cotizador `/admin/cotizador`, Ventas `/admin/ingresos`, Análisis `/admin/analisis`, Bitácora `/admin/bitacora` y Curso IA `/admin/curso`.
- **Lo que ya funciona y se conserva:**
  - Inicio: salidas de hoy, estado del río, lugares de eventos (Xantolo), ingresos del mes, pendiente de cobro, cotizaciones pendientes y "¿Quién ve qué?" (permisos por pestaña para Martín y Erick).
  - Reservas con estados Pagada / Pendiente / Cancelada; cotizaciones con Borrador / Enviada / Por vencer / Aceptada / Vencida y botón "Recordar por WhatsApp".
  - Ventas: clics a WhatsApp por página y tour, ventas por mes, tours más vendidos y origen de la reserva.
  - Reseñas: lectura semanal de Google, encuesta después del tour, clientes que vuelven y lista de reseñas por pedir por WhatsApp.
  - Análisis: check-in del cliente (cómo nos conoció, con quién viaja) y conexión a GA4.
  - Corte semanal con ventas, costos, utilidad y reparto 50/50.
- **Números de confirmación:** `HP-M-` + 8 caracteres = reserva capturada a mano en el panel; `HP` + 8 caracteres + 2 = reserva creada por el pago en la web; `COT-` + 8 caracteres = cotización. Los 8 caracteres son la hora de creación en milisegundos en base 36. Úsalo para reconstruir fechas y canal en datos históricos.
- **Calendario:** cada entrada es un día de tour de una reserva. Una reserva con varios tours genera varias entradas. Por eso en noviembre el encabezado dice "31 salidas": son 20 reservas que generan 31 días de tour, que agrupados por tour y día son 27 salidas reales. El panel debe distinguir reserva, día de tour y salida.
- **Estilo actual:** fondo gris muy claro, menú lateral blanco, títulos en serif, texto en sans-serif y un verde oscuro como acento. Consérvalo.

## Números actuales

Línea base tomada de la base del panel al 3 nov 2026 y verificada contra sus propios totales. Detalle completo, metodología y verificación: [Línea base y metas del rediseño](https://claude.ai/artifact/Fzg9cRAJxCabWSBpG3iWj5). Úsala como dato de prueba: cuando el panel nuevo calcule estos números sobre la misma base, deben salir iguales.

| Dato | Valor al 3 nov 2026 |
| --- | --- |
| Reservas registradas (14 may – 3 nov) | 97: 81 pagadas y 16 pendientes |
| Vendido / cobrado / por cobrar | $884,483 / $753,747 / $130,736 |
| Saldos vencidos (tour ya pasó) | $5,750 en 2 reservas |
| Reservas y vendido por mes de captura | May 5 · $60,414 · Jun 6 · $111,400 · Jul 15 · $141,570 · Ago 19 · $192,700 · Sep 16 · $125,430 · Oct 33 · $238,889 |
| Ticket promedio (oct) | $7,239 |
| Personas por reserva (oct) | 2.6; 21 de 33 reservas fueron de 1 o 2 personas |
| Cotizaciones | 236: 106 borradores, 14 enviadas, 82 aceptadas, 34 vencidas |
| Embudo 8–28 oct | 76 leads nuevos (revisión de WhatsApp) → 44 clientes cotizados (48 cotizaciones) → 23 reservas = 30 % |
| Cotización → reserva (8–28 oct) | 48 % en número; 23 % en monto ($179,290 de $784,904) |
| Salidas de noviembre | 20 reservas → 31 días de tour → 27 salidas; 2.8 personas por salida; 8 salidas regulares con 2 personas |
| Margen de contribución | 30 % en el único corte cerrado (19–25 oct: ventas $37,730, utilidad $11,388) |
| Score del operador en WhatsApp | 75 % (meta 85 %) |
| Google | 4.7 con 163 reseñas; clientes que vuelven 2 % (2 de 95) |

## Datos a corregir primero

Estos problemas distorsionan los números. Corrígelos en la Fase 0 o al inicio de la Fase 1, antes de construir el scorecard.

| Problema | Qué pasa hoy | Corrección |
| --- | --- | --- |
| Canal de la reserva | Ventas dice Web 90 / WhatsApp 7, pero solo 16 se crearon en el pago web y 81 a mano | Campo de canal obligatorio al capturar; migración que corrija el histórico según el tipo de número de confirmación y deje el resto como "Por confirmar" |
| Cancelaciones | 0 canceladas, aunque sí hubo | Estado Cancelada con motivo obligatorio; prohibir borrar reservas |
| Borradores de cotización | 106 borradores (101 de antes de octubre) inflan "Cotizaciones activas: 120" | Archivar automáticamente los borradores de más de 30 días; "activas" = enviadas y por vencer |
| Clics a WhatsApp | 34 de 154 clics en 30 días vienen de páginas /admin | Excluir rutas /admin y usuarios con sesión del conteo |
| Corte semanal | Solo un corte cerrado; en él ventas − costos = $13,170 pero dice utilidad $11,388, y la parte de Manolo no es la mitad | Revisar la fórmula con Manolo y documentarla; mostrar cada descuento por separado |
| Borrador del corte 26 oct – 1 nov | Ventas $0 aunque hubo $29,550 en tours | Que el corte lea las reservas por fecha de tour |
| Captura tardía | 4 de 97 reservas se capturaron después del tour | Alerta si la fecha del tour ya pasó al capturar |
| Anticipo del Viaje CDMX | El pago web cobra 10 %; la regla es 30 % | Confirmar con Manolo y usar un solo valor configurable |
| GA4 y check-in | GA4 sin conectar (falta GA4\_PROPERTY\_ID); 0 de 97 reservas con check-in | Pedir el ID; enviar el check-in junto con la confirmación |

## Objetivo del rediseño

Que la operación funcione con estándar de primer nivel aunque Manolo le dedique solo unas horas a la semana. Cada lead, reserva, salida y peso debe quedar registrado, medido y con un siguiente paso claro. La meta principal al 31 ene 2027 es que el 40 % de los leads termine en reserva (hoy 30 %); las demás metas están en "Reglas de negocio y fórmulas".

**Principios**

1. **Una sola fuente de verdad.** Lead, conversación, cotización, pago, salida, costos y reseña viven en la misma base de datos y se enlazan entre sí.
2. **Todo tiene dueño y fecha.** Ningún lead o tarea queda sin responsable ni próximo paso.
3. **Automatizar lo que es regla; asistir con IA lo que requiere criterio.** Las reglas (cambios de etapa, recordatorios) son código determinista. El agente de IA redacta, interpreta conversaciones y detecta patrones.
4. **Nada sale al cliente sin aprobación** hasta que esa automatización demuestre ser confiable.
5. **Medir siempre igual.** Los KPIs se calculan con las fórmulas de este documento y se ven en el mismo lugar cada semana.
6. **Rápido y usable en celular.** El operador trabaja desde el teléfono gran parte del día.

## Reglas de trabajo

- **Primero entiende, luego propone.** Antes de escribir código, revisa el repo y entrega un plan: qué existe, qué se reutiliza, qué tablas y rutas nuevas vas a crear, riesgos y orden de trabajo. Espera aprobación.
- **No rompas lo que funciona.** Reservas, cobros con Stripe, el cotizador, el corte semanal y el sitio público deben seguir funcionando en cada paso.
- **Migraciones seguras.** Solo migraciones aditivas. Nada se borra ni se renombra sin migrar los datos existentes. Haz respaldo antes de cada migración en producción.
- **Entregas pequeñas.** Una fase = una rama y un PR (o varios PRs chicos) con descripción de qué cambió y cómo probarlo.
- **Secretos fuera del código.** Las llaves (Meta, Stripe, correo, IA) van en variables de entorno de Railway. Nunca en el repo.
- **Webhooks robustos.** Verifica firmas, procesa cada evento una sola vez (idempotencia) y responde rápido; el trabajo pesado va a una cola o tarea en segundo plano.
- **Pruebas.** Pruebas de las fórmulas de KPIs, del agrupado de reservas en salidas, de las transiciones de etapa y de los webhooks.
- **Interfaz en español de México.** Moneda MXN con formato $1,400. Fechas como "mar 3 nov". Zona horaria America/Mexico\_City.
- **Accesible.** Botones y enlaces reales, contraste mínimo 4.5:1, el color nunca es la única señal (siempre con texto) y áreas táctiles de 44 px en celular.
- **Si algo de este documento choca con lo que encuentras en el repo,** pregunta antes de decidir.

## Sistema visual

Conserva el estilo actual y formálizalo como tokens (variables CSS o el sistema que ya use el repo). Referencia visual: [Panel Huasteca — Operación nivel VP](https://claude.ai/artifact/QJMfb9J4EPDX8DoyTb9eJi).

| Token | Valor | Uso |
| --- | --- | --- |
| Fondo | #F5F5F3 | Fondo de página |
| Superficie | #FFFFFF | Tarjetas y menú lateral |
| Borde | #E6E4DF | Bordes de tarjetas y tablas |
| Texto | #1C1C1A | Texto principal |
| Texto secundario | #66655F | Etiquetas y notas |
| Acento | #1F3B2D | Botón principal, día de hoy, elemento activo |
| Bien | #2E6B45 sobre #E5F0E8 | "En meta", "Pagado" |
| Atención | #8A5A00 sobre #FBF0D9 | "Bajo mínimo", "Cerca de meta" |
| Problema | #A33A26 sobre #F8E3DE | "Vencido", "Debajo de meta" |

- **Tipografía:** títulos en serif (Cormorant Garamond 500–600 o la serif actual del panel); todo lo demás en Inter. Los números van en Inter con cifras tabulares.
- **Colores por tour:** conserva los colores actuales de cada código (TAM azul, MIN naranja, RZR ocre, SUR morado, AMA magenta, RAF azul claro, OTR gris, BUC rosa). Usa versiones oscurecidas para texto sobre fondo tenue, de modo que pasen contraste.
- **Componentes base:** tarjeta de KPI (etiqueta, valor, contexto, chip de estado), chip de tour, chip de estado, tabla, tarjeta de lead, columna de pipeline, ficha lateral, checklist, línea de tiempo, botón principal, botón secundario y estado vacío.
- **Responsive:** en celular el menú se vuelve un cajón, el pipeline se desplaza horizontalmente y las tablas anchas van en un contenedor con scroll.

## Navegación nueva

Reorganiza el menú por área. Marca con la etiqueta "Nuevo" las secciones nuevas durante las primeras semanas.

| Sección | Elementos | Notas |
| --- | --- | --- |
| Hoy | Inicio | Scorecard semanal y pendientes del día |
| Comercial | Bandeja, Leads, Seguimientos, Cotizaciones, Clientes | Bandeja, Leads y Seguimientos son nuevos. Contador de leads activos y de seguimientos vencidos (en rojo). |
| Operación | Calendario, Salidas del día, Reservas, Viaje CDMX, Rutas y protocolos, Proveedores | Salidas del día, Rutas y Proveedores son nuevos |
| Dinero | Cobros, Corte semanal, Cotizador, Rentabilidad | Rentabilidad reemplaza a Ventas y Análisis |
| Calidad | Score WhatsApp, Reseñas, Fotos | Score WhatsApp es nuevo |
| Agente | Propuestas, Oportunidades | Nuevo (Fase 4) |
| Control | Bitácora, Curso IA | Sin cambios |

Al pie del menú: usuario y rol, y el enlace "Ver sitio".

**Roles y permisos:** Director (todo), Operador (Comercial, Calendario, Salidas, Score propio), Socio operador (Operación, costos de salidas, Corte semanal), Guía (solo sus salidas). Ya existen permisos por pestaña ("¿Quién ve qué?" en Inicio); extiéndelos a las secciones nuevas en lugar de crear otro sistema.

## Pantallas

Cada pantalla debe tener estado vacío, estado de carga y versión de celular.

### Inicio — Scorecard semanal

- Encabezado: fecha, número de semana y selector Semana / Mes / Temporada. Botón "Revisión del jueves" que lleva a Score WhatsApp.
- 8 tarjetas de KPI, cada una con valor, contexto, meta y chip de estado: leads nuevos, tiempo de primera respuesta, conversión lead → anticipo, pax por salida, vendido, margen de contribución, score de WhatsApp y tasa de reseñas. Fórmulas en "Reglas de negocio".
- Embudo de la semana: Leads → Calificados → Cotizados → Anticipo pagado, con conversión entre pasos y un aviso automático en el paso con la mayor caída.
- Pendientes de hoy: seguimientos vencidos, salidas del día con avance del checklist, anticipos por vencer, reseñas por pedir y salidas que conviene agrupar. Cada pendiente enlaza a su pantalla.
- Tabla "Salidas de la semana": fecha, tour, clientes, pax, margen estimado y estado (En meta / Bajo mínimo / Lleno). Si un tour no tiene costos capturados, se muestra "Faltan costos".

### Bandeja — conversaciones de WhatsApp

- Tres columnas: lista de chats (sin leer primero, con etapa y tiempo sin respuesta), conversación y ficha del lead.
- Contestar desde el panel: texto libre dentro de la ventana de 24 h; fuera de ella, solo plantillas aprobadas (el panel lo indica y ofrece las plantillas).
- Respuestas rápidas desde el manual de ventas.
- Botones para cambiar etapa, crear tarea, agregar nota y enviar cotización o link de anticipo sin salir del chat.
- En celular: lista → chat → ficha, como pantallas sucesivas.

### Leads — pipeline

- Columnas por etapa: Nuevo, Calificado, Cotizado, En seguimiento, Anticipo pagado, Confirmado. Perdido y Operado van en vistas aparte. Las tarjetas se arrastran entre columnas.
- Tarjeta: nombre, chips de tour, fecha del viaje, pax, monto, canal y próximo paso (rojo si está vencido).
- Filtros por canal, tour, responsable y fecha del viaje, además de un buscador por nombre o teléfono.
- Ficha del lead: barra de etapas; campos (canal, tour, fecha, pax, perfil, hospedaje, monto, anticipo 30 %, responsable, próximo paso); historial unificado (mensajes, cambios de etapa, pagos, notas, tareas); acciones; motivo de pérdida obligatorio al marcar Perdido.
- Abajo: gráfica de motivos de pérdida del mes.

### Seguimientos

- Lista de tareas de hoy, vencidas y próximas, agrupadas por responsable. Se marcan como hechas o se posponen en un clic.

### Calendario

- Mantén la vista mensual actual y agrega el interruptor "Salidas agrupadas / Reservas".
- En "Salidas agrupadas", las reservas del mismo tour y día se muestran como una sola salida: código, pax/cupo, barra de ocupación, nombres y estado.
- Muestra las salidas fijas sin ventas como espacios punteados ("TAM fija · 0/12 · A la venta").
- Resumen arriba: reservas, días de tour y salidas reales, pax por salida, salidas bajo mínimo y salidas fijas sin ventas.
- Panel de oportunidades: salidas que conviene juntar (con el margen ganado), salidas por llenar, días vacíos y clientes de alto valor.

### Salida del día (detalle)

- Encabezado: tour, fecha, pax/cupo, tipo (fija o privada) y estado.
- Lista de pasajeros: cliente, pax, canal, estado de pago (pagado, pagado vía OTA, saldo por cobrar en sitio) y notas.
- Checklist antes de salir, editable por tour. Base: vehículo, equipo, botiquín y seguro, lista enviada al guía, proveedores confirmados (canoas, desayunos), confirmación de 24 h enviada, nivel del río y clima revisados.
- Protocolo de la ruta: punto de encuentro, guía, vehículo, paradas, plan B y proveedores. Viene de "Rutas y protocolos".
- Números de la salida: ingreso, comisiones por canal, costos fijos, costos por pax, margen de contribución y parte de cada socio.
- Simulador: margen según pax de 1 a 6.
- Acciones: mandar la lista al guía, enviar confirmaciones y pedir reseñas al terminar.

### Rutas y protocolos

- Una ficha por tour: paradas, horarios, guion del guía, puntos de seguridad, plan B, qué llevar, proveedores y costos (fijos por salida y por pax). Esta es la base de la futura "escuela de guías".

### Proveedores

- Catálogo: nombre, servicio, contacto, precio pactado por temporada y tours en los que participa.

### Rentabilidad

- Tarjetas: margen del mes, pax por salida, tours con costos capturados y margen potencial por agrupar salidas.
- Tabla por tour: salidas, pax, pax/salida, ingreso, margen, margen % y nota. Muestra "Capturar costos" si faltan.
- Distribución de salidas por tamaño y escenario de agrupación.
- Tabla por canal: reservas, comisión, conversión e ingreso neto.

### Score WhatsApp

- Score de 0 a 100 de la semana, con meta y tendencia de las últimas 8 semanas.
- Rúbrica con pesos (ver "Reglas de negocio"), puntaje por criterio y conversaciones revisadas con nota.
- Recomendaciones para la próxima semana y botón "Guardar y mandar al operador".
- Bloque de reseñas: pedidas, recibidas, tasa y lista de clientes a quienes pedirles hoy.

### Agente — Propuestas y Oportunidades

- Propuestas: cola de acciones que el agente quiere hacer, cada una con su contexto. Se aprueban, editan o rechazan en un clic (ver "Agente de operaciones").
- Oportunidades: el reporte semanal de tareas repetitivas, errores e incidencias, con impacto estimado y una solución propuesta que se convierte en tarea.

## Modelo de datos

Adáptalo al ORM y a las tablas que ya existen. Si ya hay una tabla equivalente (Reserva, Cliente, Cotización, Cobro), extíendela en lugar de duplicarla.

| Entidad | Campos clave | Se relaciona con |
| --- | --- | --- |
| Contacto | nombre, teléfono (E.164, único), correo, idioma, notas generales | Leads, Conversaciones, Reservas |
| Lead | etapa, canal de origen, tours de interés, fecha del viaje, pax, perfil, quiere hospedaje, monto cotizado, responsable, próximo paso y su fecha, motivo de pérdida, creado/actualizado | Contacto, Cotizaciones, Reservas, Tareas, Notas |
| Historial de etapa | lead, etapa anterior, etapa nueva, quién (persona, regla o agente), fecha | Lead |
| Conversación | contacto, canal (WhatsApp, Airbnb, GetYourGuide…), último mensaje entrante (para la ventana de 24 h), no leídos | Mensajes |
| Mensaje | dirección (entra/sale), tipo (texto, imagen, plantilla), contenido, id externo (único), estado (enviado, entregado, leído, falló), enviado desde (app, panel, agente), fecha | Conversación |
| Nota | lead, autor, texto, fecha | Lead |
| Tarea | lead o salida, título, responsable, vence, estado, origen (manual, regla, agente) | Lead, Salida |
| Plantilla | nombre en Meta, categoría (marketing, utilidad), idioma, variables, estado de aprobación | Mensajes |
| Automatización | disparador, condición, acción, activa, última ejecución | Registro de eventos |
| Tour | código, nombre, color, precio por pax, cupo, días de salida fija, es regular, dentro del 50/50, costos fijos por salida, costos por pax | Salidas, Ruta |
| Salida | tour, fecha, tipo (fija o privada), vehículo, guía, estado, checklist | Reservas, Costos reales |
| Reserva | contacto, lead, salida, pax, canal, precio, comisión, anticipo, saldo, estado | Pagos |
| Pago | reserva, monto, método (Stripe, transferencia, OTA, efectivo), id externo, fecha | Reserva |
| Costo de salida | salida, concepto, monto, real o estimado | Salida |
| Proveedor | nombre, servicio, contacto, precios por temporada | Tours |
| Revisión de calidad | semana, conversación, puntaje por criterio, total, notas, revisor (persona o agente) | Conversación |
| Reseña | reserva, plataforma, pedida en, recibida en, calificación | Reserva |
| Incidencia | salida o lead, tipo, descripción, causa, gravedad, resuelta | Bitácora |
| Propuesta del agente | tipo de acción, objeto, borrador, razón, estado (pendiente, aprobada, editada, rechazada), quién decidió | Lead, Salida, Tarea |
| Registro de eventos | quién, qué acción, sobre qué objeto, cuándo, duración | Todo (lo usa el detector de oportunidades) |

**Regla clave:** una Salida es la combinación tour + fecha (+ tipo si es privada). Las reservas se asignan a una salida. Si el calendario actual guarda solo reservas, crea las salidas agrupando las reservas existentes en una migración de datos.

## Integraciones

### WhatsApp (Cloud API de Meta en modo coexistencia)

- El número de reservas sigue en la app WhatsApp Business del operador. Con coexistencia, los mensajes de la app y de la API se reflejan en ambos lados.
- Al conectar, importa hasta 6 meses de historial de chats individuales y crea Contactos, Conversaciones y Leads a partir de ellos. Los grupos y las llamadas no se sincronizan.
- Conexión directa con Meta o mediante un proveedor (YCloud, 360dialog u otro). Propón la opción más simple y confirma que la coexistencia esté disponible para un número de México antes de construir encima.
- Webhook de mensajes: verificar firma, guardar el mensaje (idempotente por id externo), buscar el contacto por teléfono o crearlo, crear un lead en Nuevo si no hay uno abierto y actualizar la ventana de 24 h.
- Webhook de estados: enviado, entregado, leído, falló.
- Envío: texto libre solo dentro de las 24 h desde el último mensaje del cliente; fuera de ellas, solo plantillas aprobadas. El panel bloquea lo que no se puede enviar y explica por qué.
- Origen del lead: los botones de WhatsApp de la web usan texto prellenado con el tour y la página ("Hola, vengo de la web, me interesa Expedición Tamul"). El webhook lo detecta y etiqueta canal y tour.
- Costos: desde el 1 de octubre de 2026 Meta cobra las plantillas de marketing y utilidad y los mensajes de servicio arriba de 1,000 al mes por número. Muestra en el panel un contador mensual de mensajes enviados por categoría.

### Stripe

- Webhooks de pago exitoso, fallido y reembolso. Enlaza cada pago con su reserva y su lead.
- Pago del anticipo → lead a "Anticipo pagado", reserva confirmada y salida actualizada.
- Links de pago del anticipo (30 %) generados desde la ficha del lead o la cotización, con fecha de vencimiento.

### Correo

- Un proveedor transaccional (Resend o el que ya use el repo) para confirmaciones, recordatorios, solicitud de reseña y el resumen diario de pendientes del operador.

### Tareas programadas

- Cron de Railway (o el que exista) para: revisar seguimientos vencidos cada 15 min, recordatorios de 48 h y 24 h antes de cada salida, resumen diario a las 7:30 am, cierre de salidas pasadas (→ Operado) y reporte del agente los jueves a las 7:00 am. Todo en hora de México.

### Plataformas de experiencias (después)

- Airbnb Experiences, GetYourGuide y Viator: importar sus reservas (por API o por correo de confirmación) como reservas con su canal y comisión. Propón la forma más viable para cada una.

## Reglas de negocio y fórmulas

### Reglas fijas

- Anticipo: 30 % en todos los recorridos y paquetes para apartar. Saldo de 70 %: con hotel, el día del check-in; solo tours, el día del primer tour antes de salir.
- Vigencia de la cotización: configurable de 48 horas a 15 días.
- Descuentos: solo con autorización de Manolo.
- Precios: el [Tarifario 2026](https://claude.ai/artifact/FMo3N7Y8Wcdsd5a42WS16Y) es la fuente única (precio por persona según tamaño de grupo: 1 · 2 · 3–4 · 5–7 · 8–14, grupos 15+ y agencias; niños 70 % de 6 a 10 años y 50 % menores de 6; temporada alta +10 %, baja −$100; precios sin IVA). Hoy la web todavía cobra precio plano (Tamul $1,550 por persona). Cotizador, web y panel deben leer la misma tabla.
- Piso de margen por salida (después de 4 % de cobro y antes del 50/50): público 30 %, 2 personas 22 %, grupo directo 30 %, agencia 25 %. OTAs cobran ≈ 25 % de comisión: no vender parejas en salida propia por OTA.
- Mínimo rentable: 3 personas por salida en tours regulares. Con 2 o menos la salida queda "Bajo mínimo". RZR, OTR y BUC son a medida y no llevan meta de personas.
- Reparto: 50/50 de la utilidad de cada salida entre Manolo y Martín. Los RZR son negocio de Martín y quedan fuera.
- Edad mínima en tours: 5 años.
- Salidas fijas de Tamul: martes, jueves y sábado (configurable por tour).
- Costos de Expedición Tamul: fijo por salida $1,200 (gasolina $400 + guía $800); por persona $395 (entradas $45, canoa $200, desayuno $150). Los demás tours los captura Martín desde el panel; el tarifario tiene estimados para arrancar.
- Semana de medición: lunes a domingo, hora de México. Ventas por fecha de captura; operación y corte por fecha del tour.

### Etapas y transiciones automáticas

| Evento | Etapa resultante |
| --- | --- |
| Primer mensaje de un número sin lead abierto | Nuevo |
| Se capturan fecha, pax y tour | Calificado |
| Se envía una cotización | Cotizado |
| Se envía el link de anticipo | En seguimiento |
| Stripe confirma el anticipo | Anticipo pagado |
| La reserva se asigna a una salida | Confirmado |
| Pasa la fecha de la salida | Operado |
| Se marca perdido (motivo obligatorio: precio, no contestó tras cotizar, fecha sin disponibilidad, se fue con otro operador, otro) | Perdido |

Cualquier persona puede mover la etapa a mano. Cada cambio queda en el historial con quién lo hizo.

### Automatizaciones

| Disparador | Acción | Canal |
| --- | --- | --- |
| Lead nuevo sin respuesta en 10 min (horario 8:00–20:00) | Alerta al operador | Panel + notificación |
| Cotizado sin respuesta 24 h | Tarea de seguimiento | Interno |
| Cotizado sin respuesta 72 h | Propuesta de mensaje de seguimiento (aprobación) | WhatsApp, plantilla |
| Link de anticipo sin pagar 24 h | Recordatorio con fecha límite | WhatsApp + correo |
| 48 h y 24 h antes de la salida | Confirmación, punto de encuentro, qué llevar | WhatsApp + correo |
| Salida terminada | Agradecimiento y link de reseña | WhatsApp |
| Todos los días a las 7:30 | Resumen de pendientes del operador | Correo |

### Fórmulas de KPIs

| KPI | Fórmula | Hoy | Meta 31 ene 2027 |
| --- | --- | --- | --- |
| Lead → reserva | Reservas capturadas ÷ leads nuevos de la semana | 30 % | 40 % |
| Leads nuevos | Contactos nuevos por semana, por canal | 25 por semana | Línea base por canal |
| Primer mensaje en 5 min | Leads nuevos con primera respuesta ≤ 5 min en horario ÷ leads nuevos | 67 % | 90 % |
| Leads cotizados | Clientes con cotización ÷ leads nuevos | 58 % | 80 % |
| Cotización → reserva (número) | Aceptadas ÷ cotizaciones de la semana, medido 14 días después | 48 % | 55 % |
| Cotización → reserva (monto) | $ aceptado ÷ $ cotizado | 23 % | 35 % |
| Seguimiento a tiempo | Cotizaciones sin respuesta con seguimiento al día 3 ÷ las que lo necesitaban | 68 % | 95 % |
| Score del operador | Rúbrica de abajo | 75 % | 85 % |
| Reservas por mes | Reservas por fecha de captura | 33 (oct) | 43 |
| Vendido por mes | Suma del total por fecha de captura | $238,889 (oct) | $310,000 |
| Ticket promedio | Vendido ÷ reservas | $7,239 | $8,000 |
| Personas por reserva | Pax ÷ reservas | 2.6 | 3.0 |
| Personas por salida | Pax ÷ salidas (tour + día) | 2.8 | 3.5 |
| Salidas regulares con ≤ 2 pax | Conteo por mes | 8 (nov) | 3 o menos |
| Margen de contribución | Ingreso − comisiones − costo fijo de la salida − costo por pax × pax, ÷ ingreso | 30 % | 35 % |
| Cortes cerrados | Semanas con corte cerrado ÷ semanas | 1 cerrado | Todos, cada lunes |
| Saldos vencidos | Saldo de reservas cuyo tour ya pasó | $5,750 | $0 |
| Anticipo de 30 % | Reservas con saldo y anticipo de 30 % ÷ reservas con saldo | 13 de 17 | 100 % |
| Reseñas | Reseñas nuevas de Google ÷ reservas operadas | Sin medir | 40 % |
| Clientes que vuelven | Clientes con 2+ reservas ÷ clientes | 2 % | 4 % |
| Reservas con canal correcto | Reservas con canal capturado ÷ reservas | Sin dato confiable | 100 % |

Diciembre y enero son temporada alta: el scorecard compara tasas (conversión, ticket, personas por salida) contra la línea base, no solo totales.

### Rúbrica del score de WhatsApp (100 puntos)

Es la rúbrica que ya usa Manolo cada semana; respétala para poder comparar. Cada regla = % de los chats donde aplica que la cumplen × sus puntos. Si una regla no aplica esa semana se deja fuera y el total se reescala a 100. Bandas: 85–100 meta cumplida, 70–84 cerca, menos de 70 hay que corregir.

| Regla | Puntos | Cuándo aplica |
| --- | --- | --- |
| Primer mensaje en 5 min o menos | 10 | Solo clientes nuevos |
| Se presenta con su nombre | 5 | Todos |
| Cotiza a todo el que da fecha y personas | 10 | Solo clientes nuevos |
| Cotiza en 30 min o menos | 4 | Cotizaciones |
| Cotización en PDF | 4 | Cotizaciones |
| PDF también por correo | 4 | Cotizaciones |
| Dice el anticipo de 30 % | 4 | Cotizaciones (no el tour del mismo día pagado completo) |
| Dice la vigencia | 4 | Cotizaciones (igual que arriba) |
| Termina con siguiente paso | 12 | Último mensaje de la semana; no cuenta si el tour ya ocurrió |
| Ofrece link de pago o meses sin intereses | 4 | Cotizaciones en PDF |
| Reserva confirmada y avisada | 4 | Reservas |
| Seguimiento a más tardar el día 3 | 25 | Cotizaciones sin respuesta de clientes nuevos cuyo día 3 ya pasó; si el tour llega antes, antes del tour |
| Lo hablado por llamada, por escrito | 5 | Chats con llamada |
| Sin caritas | 5 | Todos |

Los chats que atiende Manolo no cuentan para el operador. El mensaje automático de vencimiento de cotización no cuenta como seguimiento.

## Agente de operaciones

El agente es un modelo de IA (Claude vía API, con uso de herramientas) conectado a funciones del propio panel. Absorbe el trabajo manual que requiere criterio y detecta oportunidades de mejora. No reemplaza las automatizaciones por reglas: trabaja encima de ellas.

### Niveles de autonomía

| Nivel | Qué hace | Ejemplos |
| --- | --- | --- |
| Lo hace solo | Acciones internas sin riesgo | Llenar campos del lead, sugerir etapa, crear tareas, armar reportes |
| Propone y una persona aprueba | Todo lo que sale a un cliente o proveedor | Respuestas, seguimientos, cambio de fecha, pedidos a proveedores |
| Solo avisa | Decisiones del director | Descuentos, reembolsos, precios, quejas, emergencias |

La autonomía se configura por tipo de acción. Cuando un tipo acumula, por ejemplo, 30 aprobaciones seguidas sin edición, el panel sugiere subirlo de nivel. Solo el director puede aceptarlo.

### Herramientas que expone el panel

- Lectura: buscar contacto o lead, leer conversación, consultar calendario y salidas, consultar tours, precios y costos, consultar pagos, leer bitácora y registro de eventos.
- Escritura interna: actualizar campos del lead, sugerir o cambiar etapa, crear nota, crear tarea, registrar incidencia.
- Salida al exterior (siempre como propuesta mientras no tenga autonomía): redactar y enviar mensaje de WhatsApp o plantilla, enviar correo, generar link de anticipo.
- Prohibido: crear o modificar precios, descuentos y reembolsos, borrar registros, cambiar permisos.

### Cuándo trabaja

- Por evento: mensaje nuevo (extrae fecha, pax, tour, perfil y hospedaje; sugiere etapa y respuesta), pago recibido, salida en 48 h (prepara lista, pedidos a proveedores y confirmaciones).
- Programado: resumen diario de prioridades; conciliación de pagos vs. reservas; borrador del corte semanal; score de WhatsApp de todas las conversaciones de la semana; reporte de oportunidades los jueves.
- A pedido: un cuadro de chat en el panel ("¿qué salidas de diciembre van con menos de 3 pax?").

### Detector de oportunidades (reporte de los jueves)

Revisa el registro de eventos, las conversaciones, la bitácora y las incidencias de la semana, y entrega hallazgos de tres tipos:

- Tareas repetitivas. Ejemplo: la misma pregunta contestada 20 veces → respuesta rápida + pregunta frecuente en la web.
- Errores. Ejemplo: cotizaciones con un precio distinto al del tabulador, reservas sin anticipo, pax distintos entre reserva y salida.
- Incidencias. Ejemplo: proveedores confirmados tarde → confirmación automática 48 h antes y un punto nuevo en el checklist.

Cada hallazgo trae evidencia (con enlaces), frecuencia, impacto estimado (tiempo, dinero o clientes) y una solución propuesta. El director la acepta y se convierte en tarea con responsable.

### Reglas del agente

- Usa solo datos del panel. Si le falta un dato, lo pregunta en la propuesta; nunca lo inventa.
- Escribe en el tono del manual de ventas, en español o en inglés según el idioma del cliente.
- Quejas, accidentes, emergencias y temas de salud pasan de inmediato a una persona.
- Toda acción del agente queda en el registro de eventos marcada como "agente".
- Cada edición o rechazo de una propuesta se guarda con su motivo para mejorar las siguientes.
- Mide: horas ahorradas, porcentaje de propuestas aprobadas sin cambios, errores detectados antes de llegar al cliente e incidencias por salida.
- Controla el gasto: modelo económico para extracción y clasificación, y modelo más capaz para redacción y reportes. Registra el costo por día.

## Fases y criterios de aceptación

Prioridad: que las fases 1 y 2 estén en producción antes de las vacaciones de diciembre, que son temporada alta. Una fase no empieza hasta que la anterior cumpla sus criterios.

1. **Fase 0 — Diagnóstico, plan y limpieza de datos**
   - Mapa del repo: rutas del panel, modelos, autenticación, permisos por pestaña, integraciones y tareas programadas existentes.
   - Plan de migración del modelo de datos, lista de PRs por fase y riesgos.
   - Correcciones de "Datos a corregir primero": canal histórico, estado Cancelada, archivo de borradores, clics /admin y fórmula del corte (esta última, con Manolo).
   - Script de conciliación que recalcule la tabla de "Números actuales" desde la base y la compare con la línea base.
   - Hecho cuando: Manolo aprueba el plan y la conciliación da $884,483 vendido, $753,747 cobrado, $130,736 por cobrar y 97 reservas al corte del 3 nov 2026.
2. **Fase 1 — Base visual, salidas y scorecard**
   - Tokens de diseño, menú nuevo con roles y componentes base.
   - Entidad Salida con migración que agrupa los días de tour existentes. Calendario con "Salidas agrupadas / Reservas". Detalle de salida con lista de pasajeros, checklist y números.
   - Captura de costos por tour y por salida; el corte semanal lee reservas y costos por fecha de tour. Inicio con el scorecard y Rentabilidad.
   - Hecho cuando: noviembre 2026 muestra 20 reservas, 31 días de tour y 27 salidas; el corte del 19–25 oct da ventas $37,730; los KPIs de octubre coinciden con la línea base; reservas, cobros y corte siguen funcionando igual.
3. **Fase 2 — CRM y WhatsApp** (antes de las vacaciones de diciembre)
   - Conexión por coexistencia e importación del historial. Bandeja, pipeline, ficha, notas, tareas y Seguimientos.
   - Transiciones automáticas con Stripe y el cotizador. Motivo de pérdida obligatorio. Enlace lead → cotización → reserva para medir la conversión real.
   - Hecho cuando: un mensaje nuevo crea o actualiza su lead en menos de 10 segundos; un pago de anticipo mueve la etapa solo; el operador trabaja un día completo desde el panel en su celular; "leads nuevos" y "primer mensaje en 5 min" salen del panel, no de la revisión manual.
4. **Fase 3 — Automatizaciones y calidad**
   - Plantillas aprobadas en Meta, recordatorios por WhatsApp y correo, resumen diario y solicitud de reseñas.
   - Score WhatsApp con la rúbrica de 14 reglas, primero con captura manual de la revisión de los jueves.
   - Hecho cuando: cada salida recibe sus confirmaciones de 48 y 24 h sin intervención; ninguna cotización pasa del día 3 sin seguimiento; no hay saldos vencidos sin tarea.
5. **Fase 4 — Agente de operaciones**
   - Copiloto: extracción de campos y borradores de respuesta en la Bandeja, con la cola de Propuestas.
   - Tareas operativas: preparación de salidas, conciliación de pagos y borrador del corte.
   - Score automático de todas las conversaciones y reporte de oportunidades de los jueves.
   - Hecho cuando: al menos 70 % de las propuestas se aprueban sin cambios durante 2 semanas, y el reporte de los jueves trae al menos 3 hallazgos con evidencia.
6. **Fase 5 — Canales externos y ajustes**
   - Importar reservas de Airbnb, GetYourGuide y Viator con su comisión. Ajustar la autonomía del agente según los resultados.

## Lo que debes pedirle a Manolo

Al terminar la Fase 0, entrega esta lista con lo que ya existe en el repo y lo que falta. Pide cada cosa justo antes de la fase que la necesita.

- [ ] Acceso al repo y al proyecto de Railway (variables de entorno, base de datos, cron).
- [ ] Fórmula del corte semanal: qué se descuenta entre ventas − costos ($13,170) y la utilidad ($11,388) del 19–25 oct, y por qué la parte de Manolo no es la mitad (Fase 0).
- [ ] Si ya se cobraron los saldos vencidos: RZR del 17 oct ($5,600) y Ruta Surrealista del 9 oct ($150) (Fase 0).
- [ ] Anticipo del Viaje CDMX en la web: 10 % o 30 % (Fase 0).
- [ ] GA4\_PROPERTY\_ID para conectar Análisis (Fase 1).
- [ ] Costos fijos y por persona de cada tour, además de Tamul (Fase 1).
- [ ] Comisiones reales de GetYourGuide, Airbnb Experiences y Viator (Fase 1).
- [ ] Usuarios y roles: Manolo (director), Erick (operación), Martín (socio) y guías (Fase 1).
- [ ] Portafolio de negocio de Meta verificado, número de WhatsApp Business del operador y decisión entre conexión directa o proveedor (Fase 2).
- [ ] Llaves de la Cloud API: token, id del número, id de la cuenta de WhatsApp Business y secreto para verificar webhooks (Fase 2).
- [ ] Llave y secreto de webhooks de Stripe (Fase 2).
- [ ] Manual de ventas de WhatsApp y textos de las plantillas (Fases 2 y 3).
- [ ] Cuenta y dominio verificado del proveedor de correo (Fase 3).
- [ ] Llave de la API de Claude y límite de gasto mensual (Fase 4).

No inventes ninguno de estos valores. Si falta uno, deja el campo visible como pendiente en el panel ("Capturar costos", "\[comisión de contrato\]") y sigue con lo demás.
