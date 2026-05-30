# Bot de WhatsApp — Tours Huasteca Potosina

Agente de WhatsApp (Claude) que asesora, recomienda y reserva los **7 tours** de
huasteca-potosina.com. Adaptado del bot de Axilitla 4x4 y mejorado con los
comportamientos del bot del hotel.

## Qué hace
- Recomienda el tour ideal según el perfil del cliente (mismo criterio que el recomendador del sitio).
- Da precios exactos **por persona** (niños 6–10 = 70 %, menores de 6 = 50 %) — nunca inventa montos.
- Es honesto con lo que cada tour incluye/NO incluye (RZR y Rappel no incluyen transporte ni comida).
- Cierra la venta de dos formas: **link de Stripe** (tarjeta) o **cotización + transferencia** con folio.
- Debounce, **pausa por humano**, **escalación a humano**, comandos del dueño.

## Arquitectura
El bot NO toca la base directo: habla con el sitio por HTTP (`/api/bot/*`) usando
`AGENT_API_TOKEN`. El sitio (Next.js + Prisma/Postgres) crea y confirma las reservas.

```
WhatsApp → index.js (debounce, pausa, comandos) → agent.js (Claude + tools)
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
npm run check     # node --check de todos los archivos
npm test          # pruebas (necesita ANTHROPIC_API_KEY)
npm start         # conecta a WhatsApp (escanea el QR que aparece en la terminal)
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

## Mantener en sync
`catalog.js` es una copia curada de los tours del sitio (`src/lib/tours.ts`). Si
cambias precios, inclusiones o tours en el sitio, actualiza también `catalog.js`.
