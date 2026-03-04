import express from 'express';
import crypto from 'crypto';
import { paymentRateLimiter } from '../middleware/rateLimiter';
import { updateUser } from '../database/db';

const router = express.Router();

const REVOLUT_SECRET_KEY = process.env.REVOLUT_SECRET_KEY || '';
const REVOLUT_WEBHOOK_SECRET = process.env.REVOLUT_WEBHOOK_SECRET || '';
const REVOLUT_API_URL = process.env.REVOLUT_ENV === 'sandbox'
  ? 'https://sandbox-merchant.revolut.com/api/1.0'
  : 'https://merchant.revolut.com/api/1.0';

// ─── Create a payment order via Revolut Merchant API ─────────────────────────
router.post('/create-order', paymentRateLimiter, async (req, res) => {
  if (!REVOLUT_SECRET_KEY) {
    return res.status(503).json({ message: 'Payment service not configured' });
  }

  const { amount, currency, description, userId, plan } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ message: 'Amount and currency are required' });
  }

  if (amount < 100) {
    return res.status(400).json({ message: 'Minimum amount is 100 (1.00 EUR)' });
  }

  // Unique idempotency ref: ties the Revolut order back to the user+plan+timestamp
  const merchantRef = `safe360_${userId || 'anon'}_${plan || 'upgrade'}_${Date.now()}`;

  try {
    const response = await fetch(`${REVOLUT_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        capture_mode: 'AUTOMATIC',
        merchant_order_ext_ref: merchantRef,
        description: description || 'Safe360 Payment',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[payments] Revolut order creation failed:', {
        status: response.status,
        body: error,
        merchantRef,
      });
      return res.status(response.status).json({ message: 'Failed to create payment order', error });
    }

    const order = await response.json();

    res.json({
      orderId: order.id,
      publicId: order.public_id,
      amount: order.amount,
      currency: order.currency,
      merchantRef,
      env: (process.env.REVOLUT_ENV === 'sandbox' ? 'sandbox' : 'prod') as 'prod' | 'sandbox',
    });
  } catch (err) {
    console.error('[payments] Network error calling Revolut:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ─── Revolut Webhook ─────────────────────────────────────────────────────────
// Revolut sends ORDER_COMPLETED / ORDER_PAYMENT_DECLINED / etc.
// Validates HMAC-SHA256 signature before acting on the event.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['revolut-signature'] as string | undefined;
  const rawBody = req.body as Buffer;

  // Validate HMAC signature if webhook secret is configured
  if (REVOLUT_WEBHOOK_SECRET && signature) {
    const parts: Record<string, string> = {};
    for (const part of signature.split(',')) {
      const [k, v] = part.split('=');
      if (k && v) parts[k.trim()] = v.trim();
    }

    const timestamp = parts['t'];
    const receivedSig = parts['v1'];

    if (!timestamp || !receivedSig) {
      return res.status(400).json({ message: 'Invalid signature format' });
    }

    const payload = `${timestamp}.${rawBody.toString()}`;
    const expected = crypto
      .createHmac('sha256', REVOLUT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (expected !== receivedSig) {
      console.warn('[webhook] HMAC signature mismatch — possible forged request');
      return res.status(401).json({ message: 'Invalid signature' });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  console.log('[webhook] Revolut event received:', {
    type: event.type,
    orderId: event.order_id,
    state: event.order?.state,
    merchantRef: event.order?.merchant_order_ext_ref,
  });

  // Only act on confirmed completed payments
  if (event.type === 'ORDER_COMPLETED') {
    const merchantRef: string = event.order?.merchant_order_ext_ref || '';
    // Format: safe360_<userId>_<plan>_<timestamp>
    const parts = merchantRef.split('_');
    // parts[0] = 'safe360', parts[1] = userId, parts[2] = plan
    const userId = parts[1];
    const rawPlan = parts[2] ? parts[2].charAt(0).toUpperCase() + parts[2].slice(1) : null;
    const VALID_PLANS = ['Free', 'Pro', 'Scale'] as const;
    type ValidPlan = typeof VALID_PLANS[number];
    const plan: ValidPlan | null = VALID_PLANS.includes(rawPlan as ValidPlan) ? (rawPlan as ValidPlan) : null;

    if (userId && plan) {
      try {
        await updateUser(userId, { plan });
        console.log(`[webhook] Plan upgraded: user=${userId} plan=${plan}`);
      } catch (err) {
        console.error('[webhook] Failed to upgrade plan in DB:', err);
      }
    } else {
      console.warn('[webhook] ORDER_COMPLETED but could not extract userId/plan from merchantRef:', merchantRef);
    }
  }

  res.status(200).json({ received: true });
});

export default router;
