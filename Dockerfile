FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Railway inyecta PORT automáticamente — no hardcodear aquí
CMD ["node", "server.js"]
