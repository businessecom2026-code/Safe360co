import RevolutCheckout, { RevolutCheckoutInstance } from '@revolut/checkout';

interface UpgradePlanCallback {
  (): void;
}

interface PaymentErrorCallback {
  (error: any): void;
}

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
    .then(({ publicId }) => {
      // 2. Initialize RevolutCheckout with the order public_id
      return RevolutCheckout(publicId, 'prod');
    })
    .then((instance: RevolutCheckoutInstance) => {
      // 3. Open payment popup
      instance.payWithPopup({
        onSuccess() {
          console.log('Pagamento concluido com sucesso!');
          onPaymentSuccess();
        },
        onError(error) {
          console.error('Ocorreu um erro no pagamento:', error);
          onPaymentError(error);
        },
        onCancel() {
          console.log('Pagamento cancelado pelo usuario.');
          onPaymentError({ message: 'Payment cancelled by user.' });
        }
      } as any);
    })
    .catch(error => {
      console.error('Falha ao iniciar pagamento:', error);
      onPaymentError(error);
    });
};
