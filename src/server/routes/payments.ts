import express from 'express';
import { paymentRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

const REVOLUT_SECRET_KEY = process.env.REVOLUT_SECRET_KEY || '';
const REVOLUT_API_URL = process.env.REVOLUT_ENV === 'sandbox'
  ? 'https://sandbox-merchant.revolut.com/api/1.0'
  : 'https://merchant.revolut.com/api/1.0';

// Create a payment order via Revolut Merchant API
router.post('/create-order', paymentRateLimiter, async (req, res) => {
  if (!REVOLUT_SECRET_KEY) {
    return res.status(503).json({ message: 'Payment service not configured' });
  }

  const { amount, currency, description } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ message: 'Amount and currency are required' });
  }

  if (amount < 100) {
    return res.status(400).json({ message: 'Minimum amount is 100 (1.00 EUR)' });
  }

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
        description: description || 'Safe360 Payment',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ message: 'Failed to create payment order', error });
    }

    const order = await response.json();

    res.json({
      orderId: order.id,
      publicId: order.public_id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
