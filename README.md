# Huasteca IA Generator

Sitio estático para generar itinerarios de la Huasteca, con carga de base de destinos desde Excel/CSV.

## Archivos principales

- `huasteca-ia-generator.html`: app principal
- `confirmacion-pago.html`: confirmación de pago
- `plantilla-destinos.csv`: ejemplo para carga de destinos
- `index.html`: entrada pública (redirige al generador)

## Modo pruebas (cobro deshabilitado)

El cobro está desconectado temporalmente para pruebas.

En `huasteca-ia-generator.html` busca:

```js
const TEST_MODE = {
  disablePayments: true
};
```

- `true`: no cobra y habilita PDF directo.
- `false`: activa el flujo de cobro otra vez.

## Subir a GitHub

1. Inicializa repositorio:
   - `git init`
2. Agrega archivos:
   - `git add .`
3. Commit:
   - `git commit -m "Deploy ready: GitHub + Railway"`
4. Conecta remoto y push:
   - `git branch -M main`
   - `git remote add origin <TU_REPO_URL>`
   - `git push -u origin main`

## Deploy en Railway

Este proyecto está preparado con Docker:

- `Dockerfile`
- `railway.json`

Pasos:

1. En Railway, crea proyecto nuevo.
2. Selecciona **Deploy from GitHub repo**.
3. Elige este repositorio.
4. Railway construirá el contenedor y publicará la web.
5. Abre la URL pública; cargará `index.html` y redirigirá al generador.

## Nota de seguridad

La generación de itinerario usa API externa desde frontend. Para producción se recomienda mover la llamada de IA a un backend para proteger llaves y controlar costos.
