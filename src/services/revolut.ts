import RevolutCheckout, { RevolutCheckoutInstance } from '@revolut/checkout';

// Interfaces para garantir a assinatura correta dos callbacks
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
  // 1. Insira sua Public Key (Merchant API Key) aqui
  const REVOLUT_PUBLIC_KEY = 'SEU_MERCHANT_API_KEY_AQUI';

  if (REVOLUT_PUBLIC_KEY === 'SEU_MERCHANT_API_KEY_AQUI') {
    alert('⚠️ Chave da API da Revolut não configurada. Pagamento não pode ser iniciado.');
    onPaymentError({ message: 'Revolut API Key not configured.' });
    return;
  }

  RevolutCheckout(REVOLUT_PUBLIC_KEY, 'prod').then((instance: RevolutCheckoutInstance) => {
    // Usamos 'as any' para contornar definições de tipo incorretas na SDK da Revolut
    instance.payWithPopup({
      totalAmount: amount,
      currency,
      onSuccess() {
        console.log('Pagamento concluído com sucesso!');
        onPaymentSuccess();
      },
      onError(error) {
        console.error('Ocorreu um erro no pagamento:', error);
        alert(`Erro no pagamento: ${error.message || 'Tente novamente.'}`);
        onPaymentError(error);
      },
      onCancel() {
        console.log('Pagamento cancelado pelo usuário.');
        onPaymentError({ message: 'Payment cancelled by user.' });
      }
    } as any);
  }).catch(error => {
    console.error("Falha ao carregar a SDK da Revolut:", error);
    alert("Não foi possível carregar o módulo de pagamento. Verifique sua conexão.");
    onPaymentError(error);
  });
};
