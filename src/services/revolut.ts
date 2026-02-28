interface UpgradePlanCallback {
  (): void;
}

interface PaymentErrorCallback {
  (error: any): void;
}

// Revolut environment: reads from Vite env or defaults to 'sandbox'
const REVOLUT_MODE = (import.meta.env.VITE_REVOLUT_ENV === 'prod' ? 'prod' : 'sandbox') as 'prod' | 'sandbox';

export const initiateRevolutPay = (
  amount: number,
  currency: string,
  onPaymentSuccess: UpgradePlanCallback,
  onPaymentError: PaymentErrorCallback
) => {
  // 1. Create order on server via Revolut Merchant API
  fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency, description: 'Safe360 Payment' }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create payment order');
      return res.json();
    })
    .then(async ({ publicId }) => {
      // 2. Dynamic import RevolutCheckout (only loaded when payment is initiated)
      const { default: RevolutCheckout } = await import('@revolut/checkout');
      return RevolutCheckout(publicId, REVOLUT_MODE);
    })
    .then((instance: any) => {
      // 3. Open payment popup
      instance.payWithPopup({
        onSuccess() {
          onPaymentSuccess();
        },
        onError(error: any) {
          onPaymentError(error);
        },
        onCancel() {
          onPaymentError({ message: 'Payment cancelled by user.' });
        }
      });
    })
    .catch(error => {
      onPaymentError(error);
    });
};
