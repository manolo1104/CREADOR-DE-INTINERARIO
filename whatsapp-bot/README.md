# Bot de WhatsApp — Tours Huasteca Potosina

Agente de WhatsApp (Claude) que asesora, recomienda y **cierra reservas** de los
tours de huasteca-potosina.com.

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
- **Espera por ráfaga**, **pausa por humano**, **escalación a humano**, comandos del dueño.

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
el sábado". Antes el bot contestaba a cada uno por separado. Ahora **espera 30 s a que
deje de escribir** y contesta **una sola vez a todo junto**.

- Ventana **deslizante**: cada mensaje nuevo reinicia los 30 s (`MESSAGE_DEBOUNCE_MS`).
- **Tope duro** de 90 s desde el primer mensaje (`MESSAGE_DEBOUNCE_MAX_MS`): si el
  cliente no para de escribir, contesta con lo que haya.
- **Candado**: mientras el bot arma una respuesta NO arranca otra. Lo que llegue
  mientras tanto se guarda y se contesta después, en serie.
- El mensaje se marca como **leído** al instante (palomitas azules) y sale
  "escribiendo…" mientras el modelo piensa, para que el cliente no sienta que lo ignoran.

Se prueba sin WhatsApp y sin gastar API: `npm run test-espera`.

## Arquitectura
El bot NO toca la base directo: habla con el sitio por HTTP (`/api/bot/*`) usando
`AGENT_API_TOKEN`. El sitio (Next.js + Prisma/Postgres) crea y confirma las reservas.

```
WhatsApp → index.js (pausa, comandos) → buffer.js (espera 30s) → agent.js (Claude + tools)
                                                      │ api-client.js (Bearer token)
                                                      ▼
                              Sitio Next.js  /api/bot/quote · /confirm · /booking/:folio
```

## Variables de entorno (`.env`)
Copia `.env.example` a `.env`. Claves: `ANTHROPIC_API_KEY`, `SITE_API_URL`,
`AGENT_API_TOKEN` (idéntico al del sitio), `OWNER_WHATSAPP_NUMBER`.
En el **sitio** agrega además: `AGENT_API_TOKEN`, `BANK_NAME`, `BANK_TITULAR`, `BANK_CLABE`, `BANK_CUENTA`.

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

## Comandos del dueño (desde el WhatsApp del negocio)
- `/confirma HPXXXX` — marca la reserva como pagada y avisa al cliente.
- `/pausa <numero>` / `/reanuda <numero>` — controla el bot en un chat.
- `/status` · `/help`.

## Despliegue en Railway (servicio aparte)
1. Crea un **servicio nuevo** apuntando a la carpeta `whatsapp-bot/` con el `Dockerfile` incluido (trae Chromium; usa `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`).
2. **Volumen persistente** montado en `/app/.wwebjs_auth` — si no, el bot pedirá QR en cada deploy.
3. **QR de primer arranque:** aparece como ASCII en los **logs** de Railway. (Recomendado: autentica una vez en local y copia la carpeta `.wwebjs_auth` al volumen.)
4. Variables de entorno del servicio: las de arriba (`SITE_API_URL` = URL del sitio en Railway).

## ⚠️ Prerrequisito importante
Requiere una **línea/número de WhatsApp DEDICADO**, distinto del número del bot del
hotel y del 524891251458 (un número = una sola sesión de WhatsApp).

## Mantener en sync (AUTOMÁTICO)
El "cerebro" del bot vive en **`data.json`**, que se **genera** desde la fuente de la
verdad del sitio (`src/lib/tours.ts`, `paquetes.ts`, `destinos.ts`, `tourMapping.ts`).
`catalog.js` y `knowledge.js` solo lo leen — **no edites datos a mano en ellos**.

Cuando cambies precios, tours, paquetes o destinos en el sitio, desde la raíz del
proyecto corre:

```bash
npx tsx src/scripts/export-bot-data.ts
```

Eso regenera `whatsapp-bot/data.json` (hoy: 10 tours, 3 paquetes, 41 destinos) y el bot
queda al día. La única capa manual son los overlays curados (qué NO incluye cada tour,
"ideal para", punto de encuentro) que viven dentro de ese mismo script.

> ⚠️ El bot **no** se entera solo de los cambios del sitio. Si regeneras `data.json`
> hay que volver a desplegar el servicio del bot en Railway.

## Modelo y costo
Corre en **Haiku 4.5** (`BOT_MODEL=claude-haiku-4-5`): $1 por millón de tokens de
entrada, $5 de salida. El prompt fijo (~14 mil tokens) va con **caché de 1 hora**, así
que del segundo mensaje en adelante se lee a una décima parte del precio.

⚠️ Haiku solo cachea prefijos de **4,096 tokens o más**. Si algún día se recorta mucho
el prompt, córrele `npm run medir-prompt`: por debajo de ese número el caché deja de
funcionar **en silencio** y cada mensaje se paga completo.

Para probar sin WhatsApp: `npm test` (usa la `ANTHROPIC_API_KEY` del `.env`).
