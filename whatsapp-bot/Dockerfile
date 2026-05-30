# Bot de WhatsApp — Tours Huasteca Potosina (Railway / Docker)
# whatsapp-web.js necesita Chromium; lo instalamos del sistema y le decimos
# a puppeteer que lo use (PUPPETEER_EXECUTABLE_PATH).
FROM node:20-slim

# Dependencias de Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcomposite1 libxdamage1 libxext6 \
    libxfixes3 libxrandr2 libxkbcommon0 wget \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# La sesión de WhatsApp (.wwebjs_auth) debe ir en un VOLUMEN persistente de Railway
# montado en /app/.wwebjs_auth, o el bot pedirá QR en cada deploy.
CMD ["node", "index.js"]
