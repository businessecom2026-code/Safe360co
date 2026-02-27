import RevolutCheckout from '@revolut/checkout';

// Interface para garantir que a função de callback tenha a assinatura correta
interface UpgradePlanCallback {
  (): void;
}

export const initiateRevolutPay = (
  amount: number, 
  currency: string, 
  onPaymentSuccess: UpgradePlanCallback
) => {
  // 1. Insira sua Public Key (Merchant API Key) aqui
  // Esta chave é obtida no seu painel de comerciante da Revolut
  const REVOLUT_PUBLIC_KEY = 'SEU_MERCHANT_API_KEY_AQUI';

  if (REVOLUT_PUBLIC_KEY === 'SEU_MERCHANT_API_KEY_AQUI') {
    alert('⚠️ Chave da API da Revolut não configurada. Pagamento não pode ser iniciado.');
    return;
  }

  RevolutCheckout(REVOLUT_PUBLIC_KEY, 'prod').then((instance) => {
    const revolutPay = instance.revolutPay({
      currency,
      totalAmount: amount,
      // Outras opções de layout e configuração podem ser adicionadas aqui
      buttonStyle: 'dark',
    });

    const mountPoint = document.getElementById('revolut-pay');
    if (mountPoint) {
        mountPoint.innerHTML = ''; // Limpa o container antes de montar
        revolutPay.mount(mountPoint);
    }

    revolutPay.on('payment', (event) => {
      switch (event.type) {
        case 'success':
          // 2. Lógica de Sucesso: Dispara o upgrade do plano
          console.log('Pagamento concluído com sucesso!');
          onPaymentSuccess(); 
          break;
        case 'error':
          console.error('Ocorreu um erro no pagamento:', event.error);
          alert(`Erro no pagamento: ${event.error?.message || 'Tente novamente.'}`);
          break;
      }
    });
  }).catch(error => {
    console.error("Falha ao carregar a SDK da Revolut:", error);
    alert("Não foi possível carregar o módulo de pagamento. Verifique sua conexão.");
  });
};
