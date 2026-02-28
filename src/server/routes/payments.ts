import express from 'express';
import { paymentRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

const REVOLUT_SECRET_KEY = process.env.REVOLUT_SECRET_KEY || '';
const REVOLUT_API_URL = process.env.REVOLUT_ENV === 'sandbox'
  ? 'https://sandbox-merchant.revolut.com/api/1.0'
  : 'https://merchant.revolut.com/api/1.0';

if (!REVOLUT_SECRET_KEY) {
  console.warn('⚠️  REVOLUT_SECRET_KEY not set in .env — payments will fail');
}

// Create a payment order via Revolut Merchant API
router.post('/create-order', paymentRateLimiter, async (req, res) => {
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
      console.error('Revolut API error:', error);
      return res.status(response.status).json({ message: 'Failed to create payment order', error });
    }

    const order = await response.json();
    console.log('Revolut order created:', order.id, order.public_id);

    res.json({
      orderId: order.id,
      publicId: order.public_id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Error creating Revolut order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
