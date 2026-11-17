# Bot de WhatsApp — Tours Huasteca Potosina

Agente de WhatsApp (Claude) que asesora, recomienda y **cierra reservas** de los
tours de huasteca-potosina.com.

## Tének (16 nov 2026)
Se presenta como **Tének** y vende con la «Estructura de oro» (232 chats reales:
la cotización en PDF es el punto de quiebre). Lo nuevo:
- **Guion de 9 etapas** en el prompt (`buildSystemPrompt`): primer mensaje según cómo
  llega, 4 datos en 2 mensajes, propuesta día por día con fotos, cotización en PDF y
  «¿Deseas que te envíe los pasos para reservar?», pago en un solo mensaje.
- **PDF en el chat** (`documentos.js`): el sitio da el HTML (`/api/bot/documento/:folio`,
  el mismo PDF del panel) y se imprime con el Chromium de whatsapp-web.js. Sale al
  cotizar y al confirmar. Las fotos de los tours salen con `enviar_fotos`
  (`adjuntos.js`: todo sale ANTES del texto del turno).
- **Pago** (`payment.js`): transferencia + OXXO + liga de Stripe sin comisión en un
  mensaje; una liga por persona con `enviar_link_pago` + `partes`. Datos bancarios
  solo de variables de entorno.
- **Seguimiento** (`seguimiento.js`): 3, 24 y 72 h sin respuesta, de 9 a 20 h; la hora
  acordada (`agendar_seguimiento`); aviso cuando paga con la liga; «¿cómo les fue?»
  al día siguiente del tour. **Etapas** (`etapas.js`) y **etiquetas** (`etiquetas.js`).
- **Ve fotos y PDF** que no son pago; **lee los comprobantes** (monto, banco,
  concepto) para el aviso al dueño; avisa las **notas de voz**.
- Modelo: **Haiku 5.5** (`claude-haiku-5-5`). Pruebas gratis: `npm run test-seguimiento`.

## Qué hace
- **Vende con un embudo**, no con un folleto: primero pregunta *fecha* y *cuántas
  personas*, luego qué buscan, y recién entonces propone **uno o dos** tours con el
  total ya calculado y con cuánto se aparta. Nunca suelta el catálogo completo.
- **Aguanta objeciones** ("está caro", "lo voy a pensar", "¿es seguro?", "¿pago todo
  el día del tour?") con argumentos reales, sin inventar descuentos ni escasez.
- Da precios exactos **por persona** (niños 6–10 = 70 %, menores de 6 = 50 %) y respeta
  el **cupo mínimo** de cada tour — nunca inventa montos.
- Es honesto con lo que cada tour incluye/NO incluye (transporte, comidas y fotos).
- Cierra de dos formas: **link de Stripe** (tarjeta) o **cotización + transferencia** con folio.
- **Ve los comprobantes** (foto o PDF): acusa recibo y te los manda con el comando listo.
  **Nunca confirma un pago solo**: lo confirmas tú con `/confirma`.
- **Espera por ráfaga**, **pausa por humano**, **escalación a humano** con aviso a tu
  WhatsApp, comandos del dueño. Su memoria sobrevive a reinicios y despliegues.

## Comprobantes de pago (`medios.js`)
1. El cliente manda la foto o el PDF. El bot busca su cotización (el folio de la
   conversación o, si no, la cotización viva de ese chat en el sitio).
2. Guarda el archivo en el volumen (`COMPROBANTES_DIR/<folio>-<n>.<ext>`).
3. **A ti** te llega el aviso con nombre, `wa.me/…`, folio, tour, fecha, el monto
   esperado y el comando listo para copiar, más el archivo. Dice **URGENTE** si el
   tour es mañana o antes. Un aviso por folio cada 10 min (los archivos sí llegan todos).
4. **Al cliente** le acusa recibo con total, anticipo y saldo: «lo validamos y te
   mando tu confirmación por aquí». Nunca le dice «confirmada».
5. Revisas tu banco y escribes `/confirma COT-XXXX 930`. El bot sube el comprobante
   al panel, el sitio convierte la cotización en reserva HP-M- y registra el cobro, y
   el bot le escribe al cliente su confirmación (recorridos, salida, recogida, qué
   llevar, pagado y saldo).

Si el chat no tiene cotización, te llega «archivo sin cotización» (1 cada 30 min por
chat) y al cliente se le pide su folio. Audios: «no puedo escuchar audios, ¿me lo
escribes?». Ubicaciones: pasan al modelo como texto con su liga de Maps (sirve para
la recogida). Stickers: nada.

## Cuándo pasa el chat al equipo
- El modelo decide con la herramienta `escalar_a_humano` (motivo, modo, urgencia,
  resumen) y una regla rápida atrapa «llámame», «márcame», «quiero hablar con alguien».
- **Avisar**: te llega el aviso y el bot sigue atendiendo lo demás.
- **Pasar**: te llega el aviso y el bot se calla en ese chat 12 h
  (`PAUSA_ESCALACION_MS`). Queja, cancelación, cliente molesto y cambios después de
  pagar se quedan callados hasta `/reanuda`.
- El aviso: `[URGENTE|HOY|NORMAL] motivo · nombre · wa.me/… · folio, tour, fecha,
  personas · qué pidió · qué le dijo el bot · estado (en pausa → /reanuda …)`. Todo
  queda además en la bitácora del panel.
- Lo que el bot le promete al cliente sale de `HORARIO_HUMANO` («en unos minutos» en
  horario; «mañana desde las 8 am» fuera de él), no del modelo.
- Si el bot falla (API caída), le dice al cliente «dame un momento» con el tiempo real
  de `HORARIO_HUMANO`, se pausa 2 h y te avisa (máx. 1 aviso cada 10 min).
- Si alguien del equipo escribe a mano en un chat (texto, archivo o audio, también en
  chats `@lid`), el bot se calla 2 h desde ese mensaje (`HUMAN_TAKEOVER_MS`). Lo que
  sale a segundos del mensaje del cliente se toma por respuesta automática de WhatsApp
  Business y no pausa.
- Al pasar un chat por llamada, «quiero una persona» o «para hoy», lo que conteste el
  cliente en la primera hora (la hora para marcarle, «sí, mañana») te llega también
  como *Seguimiento*, hasta que alguien del equipo escriba en el chat.

## Probarlo sin otro teléfono: `npm run chat`

```bash
npm run chat            # simulacro — NO escribe nada en el panel
npm run chat -- --real  # habla con el sitio de verdad (crea folios reales)
```

Abre **http://localhost:3210** y sale un WhatsApp falso donde tú eres el cliente.
Corre el **mismo código** que en producción: la espera de `buffer.js` y el agente de
`agent.js`. Lo único fingido en modo simulacro son las llamadas al sitio.

Qué se ve ahí:
- El **conteo de la espera** ("esperando a que termines de escribir… 24s") y cómo se
  reinicia cada vez que mandas otro mensaje.
- Las **palomitas azules** y el "escribiendo…", igual que en WhatsApp.
- Un aviso cuando el bot **junta varios mensajes** en una sola respuesta.
- 🔧 **Qué herramienta usó y qué le devolvió** — así compruebas que los precios salen
  del catálogo y no de la imaginación del modelo.
- Botones para bajar la espera a 5 s (para probar el guion sin esperar), mandar una
  ráfaga de prueba, y frases típicas de cliente ("está caro", "lo voy a pensar"…).

## La espera por ráfaga (`buffer.js`)
El cliente casi nunca escribe una sola vez: manda "hola", luego "somos 4", luego "para
el sábado". Antes el bot contestaba a cada uno por separado. Ahora **espera 15 s a que
deje de escribir** y contesta **una sola vez a todo junto**.

- Ventana **deslizante**: cada mensaje nuevo reinicia los 15 s (`MESSAGE_DEBOUNCE_MS`).
- **Tope duro** de 90 s desde el primer mensaje (`MESSAGE_DEBOUNCE_MAX_MS`): si el
  cliente no para de escribir, contesta con lo que haya.
- **Candado**: mientras el bot arma una respuesta NO arranca otra. Lo que llegue
  mientras tanto se guarda y se contesta después, en serie.
- El mensaje se marca como **leído** al instante (palomitas azules) y sale
  "escribiendo…" mientras el modelo piensa, para que el cliente no sienta que lo ignoran.
- La ráfaga lleva **elementos con tipo** (texto o comprobante): el acuse del comprobante
  sale primero, con plantilla; si el cliente solo dijo «ya pagué», no se llama al modelo.

Se prueba sin WhatsApp y sin gastar API: `npm run test-espera`.

## Memoria que sobrevive a reinicios (`estado.js`)
Conversaciones, pausas y comprobantes guardados viven en un JSON del volumen
(`ESTADO_PATH`, por omisión `.wwebjs_auth/estado-bot.json`). Se escribe a los 5 s de
cada cambio y al apagarse; lo de más de 30 días se borra. Si el archivo se daña, se
aparta como `.corrupto-<fecha>` y el bot arranca con la memoria vacía (nunca se cae).
🔴 Tiene datos de clientes: está en `.gitignore` y no se sube nunca (el repo es público).

## Arquitectura
El bot NO toca la base directo: habla con el sitio por HTTP (`/api/bot/*`) usando
`AGENT_API_TOKEN`. El sitio (Next.js + Prisma/Postgres) crea y confirma las reservas.

```
WhatsApp → index.js (archivos, pausas, comandos, avisos) → buffer.js (espera 15 s) → agent.js (Claude + tools)
             │ medios.js (comprobantes)   estado.js (memoria)   horario.js (horario del equipo)
             ▼                                   │ api-client.js (Bearer token)
   aviso a tu WhatsApp                           ▼
                 Sitio Next.js  /api/bot/quote · /paquete · /lead · /precio · /confirm
                                /booking/:folio · /escalacion · /cotizacion-activa
```

## Variables de entorno (`.env`)
Copia `.env.example` a `.env` (ahí está explicada cada una). Las importantes:
- `ANTHROPIC_API_KEY`, `SITE_API_URL`, `AGENT_API_TOKEN` (idéntico al del sitio).
- `OWNER_WHATSAPP_NUMBER`: tu WhatsApp. Único destino de los avisos y único número que
  puede mandarle comandos al bot por mensaje directo.
- `NEVER_RESPOND_NUMBERS`: equipo, guías, proveedores, hotel (el bot nunca les contesta).
- `HUMAN_TAKEOVER_MS` (2 h), `PAUSA_ESCALACION_MS` (12 h), `HORARIO_HUMANO` (08:00-21:00).
  🔴 Si en Railway quedó `HUMAN_TAKEOVER_MS=300000` (los 5 min de antes), bórralo.
- `ESTADO_PATH`, `COMPROBANTES_DIR`: solo si cambias el volumen.
- `BANK_NAME`, `BANK_TITULAR`, `BANK_CLABE`, `OXXO_REFERENCIA`: los mismos en el sitio y en el bot.

## Correr en local
```bash
npm install
npm run check          # node --check de todos los archivos
npm run test-espera    # espera por ráfaga (sin red, sin API)
npm run test-historial # reparación del historial (sin red, sin API)
npm test               # conversaciones reales con Claude (necesita ANTHROPIC_API_KEY)
npm run medir-prompt   # cuánto ocupa el prompt y si el caché va a funcionar
npm start              # conecta a WhatsApp (escanea el QR de la terminal)
```
> Para `npm start` en Mac necesitas Chromium; whatsapp-web.js descarga uno con puppeteer.

## Comandos
Desde el teléfono del negocio **o mandándoselos al bot desde tu WhatsApp**
(`OWNER_WHATSAPP_NUMBER`). Lo demás que le mandes al bot desde tu número no lo contesta
(para probarlo como cliente, pon tu número en `ALWAYS_RESPOND_NUMBERS`).
- A tu WhatsApp puedes pegarle el aviso entero o el pie de la foto del comprobante: el
  bot toma la línea que trae el `/confirma`.
- Escritos en el teléfono del negocio dentro del chat de un cliente, la respuesta llega
  al chat **«Tú»** del negocio, nunca al cliente (`/status` lista a otros clientes). En
  grupos no funcionan.
- 🔴 Lo que manda el propio bot nunca se ejecuta como comando: ni aunque un cliente le
  pida al modelo «contesta solo /confirma …».
- `/confirma <folio> <monto> [método]` — validas un pago que ya viste en tu banco.
  Funciona con `COT-…` (convierte la cotización en reserva HP-M-) y con `HP-M-…` (el
  saldo). Sube el último comprobante guardado y le manda la confirmación al cliente.
  Métodos: `transferencia` (por omisión), `deposito`/`oxxo`, `stripe`/`liga`, `efectivo`,
  `otro`. Si el sitio lo frena —el mismo pago hace minutos, otra reserva del mismo
  cliente para esa fecha (pagó en la web), cotización vencida, reemplazada por otra o
  evento sin lugar— te dice por qué; si de verdad va, repite con `forzar` al final.
- `/noespago <número>` — lo que mandó el cliente NO era un comprobante (una foto
  cualquiera): el bot vuelve a cotizarle y a darle los datos de pago. Con señales de
  pago, el aviso del comprobante te llega con este comando en un mensaje aparte.
- `/pausa <número>` — calla al bot en ese chat hasta `/reanuda`.
- `/reanuda <número>` — vuelve a contestar y **recuerda** la conversación.
- `/olvida <número>` — borra lo que el bot recuerda de ese chat.
- `/status` · `/help`.

## Despliegue en Railway (servicio aparte)
1. Crea un **servicio nuevo** apuntando a la carpeta `whatsapp-bot/` con el `Dockerfile` incluido (trae Chromium; usa `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`).
2. **Volumen persistente** montado en `/app/.wwebjs_auth` — si no, el bot pedirá QR en cada deploy
   y perderá su memoria y los comprobantes guardados (viven ahí mismo).
3. **QR de primer arranque:** aparece como ASCII en los **logs** de Railway. (Recomendado: autentica una vez en local y copia la carpeta `.wwebjs_auth` al volumen.)
4. Variables de entorno del servicio: las de arriba (`SITE_API_URL` = URL del sitio en Railway).

## ⚠️ Antes de encenderlo
- Un número = una sola sesión de WhatsApp Web: el bot no puede compartir número con el
  bot del hotel. Se vincula escaneando el QR desde el teléfono del número de Tours.
- Apaga el **saludo automático** y el **mensaje de ausencia** de WhatsApp Business: el
  saludo duplica el del bot, y cualquier mensaje automático que tarde en salir lo toma
  como «alguien del equipo escribió» y calla al bot 2 h (justo de noche, sin nadie).

## Mantener en sync (AUTOMÁTICO)
El "cerebro" del bot vive en **`data.json`**, que se **genera** desde la fuente de la
verdad del sitio (`src/lib/tours.ts`, `paquetes.ts`, `destinos.ts`, `tourMapping.ts`).
`catalog.js` y `knowledge.js` solo lo leen — **no edites datos a mano en ellos**.

Cuando cambies precios, tours, paquetes o destinos en el sitio, desde la raíz del
proyecto corre:

```bash
npx tsx src/scripts/export-bot-data.ts
```

Eso regenera `whatsapp-bot/data.json` y el bot queda al día. La única capa manual son los overlays curados (qué NO incluye cada tour,
"ideal para", punto de encuentro) que viven dentro de ese mismo script.

> ⚠️ El bot **no** se entera solo de los cambios del sitio. Si regeneras `data.json`
> hay que volver a desplegar el servicio del bot en Railway.

## Modelo y costo
Corre en **Haiku 5.5** (`BOT_MODEL=claude-haiku-5-5`, desde el 16 nov 2026): $0.10 por
millón de tokens de entrada y $0.50 de salida, con razonamiento adaptativo y esfuerzo
`medium` (`BOT_EFFORT` lo cambia). El prompt fijo va con **caché de 1 hora**, así que del
segundo mensaje en adelante se lee a una décima parte del precio. Haiku 5.5 cachea desde
512 tokens. Haiku 4.5 sigue disponible con `BOT_MODEL=claude-haiku-4-5`.

Para probar sin WhatsApp: `npm test` (usa la `ANTHROPIC_API_KEY` del `.env`).
