# Implementación de Cobro y PDF

Se añadió en `huasteca-ia-generator.html`:

1. **Módulo de cobro** en la pantalla de resultado.
2. **Bloqueo de descarga PDF** hasta confirmar pago.
3. **Generación de PDF real** con `jsPDF`.
4. **Flujo comercial** con orden (`HX-XXXXXX`) y datos de cliente.

## Qué debes configurar

Dentro del script, edita el objeto `PAYMENT_CONFIG`:

- `stripeLink`: tu link real de cobro Stripe.
- `paypalLink`: tu link real de PayPal.
- `transferenciaInstrucciones`: datos bancarios reales.
- `precioBase` y `extraPorDia`: precio de tu servicio.

## Flujo de uso

1. Genera el itinerario.
2. Captura datos del cliente.
3. Selecciona método de pago y cobra.
4. Clic en **“Ya quedó pagado ✓”**.
5. Se habilita **“Descargar PDF”**.

## Nota importante

Esta versión es **frontend** (sin backend), por lo que la confirmación del pago es manual.
Si quieres confirmación automática de pago, el siguiente paso es conectar:

- Webhook de Stripe/PayPal
- Base de datos de órdenes
- Endpoint para verificación y desbloqueo automático
