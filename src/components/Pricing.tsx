import { Check, ShieldCheck, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Language, translations } from '../translations';
import { useAuth } from '../context/AuthContext';
import { initiateRevolutPay } from '../services/revolut';

interface PricingProps {
  lang: Language;
  onRegister?: () => void;
}

const PLAN_PRICES_EUR: Record<string, number> = {
  Pro: 500,   // EUR 5.00
  Scale: 1500, // EUR 15.00
};

export function Pricing({ lang, onRegister }: PricingProps) {
  const t = translations[lang];
  const { user, token } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [planPrice, setPlanPrice] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const plans = [
    {
      name: t.pricing.free.name,
      key: 'Free',
      price: t.pricing.free.price,
      period: '/mês',
      description: t.pricing.free.features[0],
      features: t.pricing.free.features,
      highlight: false,
    },
    {
      name: t.pricing.pro.name,
      key: 'Pro',
      price: isAnnual ? (lang === 'pt' ? 'R$ 17,90' : '$ 4.40') : t.pricing.pro.price,
      period: '/mês',
      description: t.pricing.pro.features[0],
      features: t.pricing.pro.features,
      highlight: true,
      savings: isAnnual ? (lang === 'pt' ? 'Economize 10%' : 'Save 10%') : null,
    },
    {
      name: t.pricing.scale.name,
      key: 'Scale',
      price: isAnnual ? (lang === 'pt' ? 'R$ 44,90' : '$ 11.60') : t.pricing.scale.price,
      period: '/mês',
      description: t.pricing.scale.features[0],
      features: t.pricing.scale.features,
      highlight: false,
      savings: isAnnual ? (lang === 'pt' ? 'Economize 10%' : 'Save 10%') : null,
    },
  ];

  const handleSelectPlan = (planKey: string) => {
    if (planKey === 'Free') return;

    if (!user || !token) {
      onRegister?.();
      return;
    }

    if (user.plan === planKey) return;

    const price = PLAN_PRICES_EUR[planKey];
    if (!price) return;

    setSelectedPlan(planKey);
    setPlanPrice(price);
    setPaymentError('');
    setPaymentSuccess(false);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    setPaymentLoading(true);
    setPaymentError('');

    initiateRevolutPay(
      planPrice,
      'EUR',
      async () => {
        try {
          const response = await fetch('/api/auth/upgrade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ plan: selectedPlan }),
          });

          if (response.ok) {
            setPaymentSuccess(true);
          } else {
            setPaymentError('Erro ao atualizar plano. Contacte o suporte.');
          }
        } catch {
          setPaymentError('Erro de conexao.');
        } finally {
          setPaymentLoading(false);
        }
      },
      (error) => {
        setPaymentLoading(false);
        setPaymentError(error?.message || 'Pagamento cancelado ou falhou.');
      }
    );
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan('');
    setPlanPrice(0);
    setPaymentLoading(false);
    setPaymentSuccess(false);
    setPaymentError('');
  };

  const getButtonLabel = (planKey: string) => {
    if (planKey === 'Free') {
      return lang === 'pt' ? 'Plano Atual' : lang === 'en' ? 'Current Plan' : 'Plan Actual';
    }
    if (user && user.plan === planKey) {
      return lang === 'pt' ? 'Plano Atual' : lang === 'en' ? 'Current Plan' : 'Plan Actual';
    }
    return `${t.pricing.cta} ${plans.find(p => p.key === planKey)?.name || planKey}`;
  };

  return (
    <section className="py-24 bg-gray-50 dark:bg-slate-900/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.pricing.title}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {lang === 'pt' ? 'Mensal' : lang === 'en' ? 'Monthly' : 'Mensual'}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-8 bg-blue-600 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div
                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {lang === 'pt' ? 'Anual' : lang === 'en' ? 'Annual' : 'Anual'} <span className="text-green-500 text-xs font-bold ml-1">-10% OFF</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = user && user.plan === plan.key;
            const isFree = plan.key === 'Free';

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 flex flex-col ${
                  plan.highlight
                    ? 'bg-white dark:bg-slate-800 shadow-xl ring-2 ring-blue-600 scale-105 z-10'
                    : 'bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl border border-gray-100 dark:border-slate-700'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    {lang === 'pt' ? 'Mais Popular' : lang === 'en' ? 'Most Popular' : 'Más Popular'}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <p className="text-green-500 text-sm font-medium mt-1">{plan.savings}</p>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrentPlan || isFree}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 cursor-default'
                      : isFree
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-default'
                        : plan.highlight
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                          : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white cursor-pointer'
                  }`}
                >
                  {isCurrentPlan ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {lang === 'pt' ? 'Plano Atual' : lang === 'en' ? 'Current Plan' : 'Plan Actual'}
                    </span>
                  ) : (
                    getButtonLabel(plan.key)
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>

            {!paymentSuccess ? (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 mb-3">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold">
                    {lang === 'pt' ? 'Upgrade de Plano' : lang === 'en' ? 'Plan Upgrade' : 'Mejorar Plan'}
                  </h3>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      {lang === 'pt' ? 'Plano' : 'Plan'}
                    </span>
                    <span className="font-medium">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      {lang === 'pt' ? 'Periodo' : lang === 'en' ? 'Period' : 'Periodo'}
                    </span>
                    <span className="font-medium">
                      {lang === 'pt' ? 'Mensal' : lang === 'en' ? 'Monthly' : 'Mensual'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      {lang === 'pt' ? 'Beneficiario' : lang === 'en' ? 'Provider' : 'Beneficiario'}
                    </span>
                    <span className="font-medium">Ecom360.co</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Total</span>
                    <span className="font-bold text-lg">EUR {(planPrice / 100).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {paymentError && (
                  <p className="text-red-500 text-xs text-center mb-3">{paymentError}</p>
                )}

                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 border border-slate-300 dark:border-slate-600">
                    {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      lang === 'pt' ? 'Pagar Agora' : lang === 'en' ? 'Pay Now' : 'Pagar Ahora'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold">
                    {lang === 'pt' ? 'Plano Atualizado!' : lang === 'en' ? 'Plan Upgraded!' : 'Plan Mejorado!'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {lang === 'pt'
                      ? `Seu plano foi atualizado para ${selectedPlan}. Faca login novamente para aplicar.`
                      : lang === 'en'
                        ? `Your plan has been upgraded to ${selectedPlan}. Please log in again to apply.`
                        : `Su plan ha sido mejorado a ${selectedPlan}. Inicie sesion nuevamente para aplicar.`}
                  </p>
                </div>
                <button
                  onClick={() => { closeModal(); window.location.reload(); }}
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  OK
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default Pricing;
