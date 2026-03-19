// ══════════════════════════════════════════════════════
//  HUASTECA IA — SERVIDOR EXPRESS (Railway)
//  Versión: 4.1
//  - Proxy seguro a Anthropic (API key nunca en cliente)
//  - Stripe Checkout Sessions para cobros (PCI compliant)
//  - Sirve los archivos estáticos del frontend
// ══════════════════════════════════════════════════════

const express = require('express');
const Stripe = require('stripe');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static('.'));

// ── Health check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
  });
});

// ── Proxy seguro a Anthropic ──────────────────────────
// La API key NUNCA sale al cliente; vive solo en variables de entorno de Railway
app.post('/api/generate', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY no configurada en el servidor.',
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Error de Anthropic API' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Error al contactar la IA: ${err.message}` });
  }
});

// ── Stripe: crear Checkout Session ───────────────────
// Nunca capturamos datos de tarjeta — Stripe lo maneja en su dominio seguro
app.post('/api/cobrar', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      error: 'STRIPE_SECRET_KEY no configurada en el servidor.',
    });
  }

  const { monto, descripcion, email_cliente } = req.body;

  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'Monto inválido.' });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: descripcion || 'Itinerario Huasteca Potosina',
            description: 'Itinerario personalizado generado con IA — Huasteca IA',
          },
          // Stripe trabaja en centavos
          unit_amount: Math.round(parseFloat(monto) * 100),
        },
        quantity: 1,
      }],
      customer_email: email_cliente || undefined,
      success_url: `${appUrl}/confirmacion-pago.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/confirmacion-pago.html?status=cancelled`,
      metadata: {
        origen: 'huasteca-ia',
        descripcion: descripcion || '',
      },
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    res.status(500).json({ error: `Error al crear sesión de Stripe: ${err.message}` });
  }
});

// ── Iniciar servidor ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 Huasteca IA corriendo en http://localhost:${PORT}`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✅ configurada' : '⚠️  no configurada (modo local)'}`);
  console.log(`   Stripe:        ${process.env.STRIPE_SECRET_KEY ? '✅ configurado' : '⚠️  no configurado (cobros desactivados)'}\n`);
});
