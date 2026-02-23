import { Check } from 'lucide-react';
import { useState } from 'react';

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'FREE',
      price: '€ 0',
      period: '/mês',
      description: 'Para quem está começando',
      features: ['Monitoramento básico', '1 Domínio', 'Relatórios mensais', 'Suporte por email'],
      highlight: false,
    },
    {
      name: 'PRO',
      price: isAnnual ? '€ 4,50' : '€ 5',
      period: '/mês',
      description: 'Para pequenos negócios',
      features: ['Monitoramento 24/7', '3 Domínios', 'Relatórios semanais', 'Suporte prioritário', 'Certificado SSL'],
      highlight: true,
      savings: isAnnual ? 'Economize 10%' : null,
    },
    {
      name: 'SCALE',
      price: isAnnual ? '€ 9' : '€ 10',
      period: '/mês',
      description: 'Para empresas em crescimento',
      features: ['Monitoramento avançado', '10 Domínios', 'Relatórios diários', 'Gerente de conta', 'API Access', 'Audit Logs'],
      highlight: false,
      savings: isAnnual ? 'Economize 10%' : null,
    },
  ];

  return (
    <section className="py-24 bg-gray-50 dark:bg-slate-900/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Planos transparentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Escolha o plano ideal para o seu negócio. Sem taxas escondidas.
          </p>

          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              Mensal
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
              Anual <span className="text-green-500 text-xs font-bold ml-1">-10% OFF</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => (
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
                  Mais Popular
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
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {plan.description}
                </p>
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
                className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white'
                }`}
              >
                Escolher {plan.name}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-slate-800/50 py-4 px-6 rounded-xl max-w-2xl mx-auto border border-blue-100 dark:border-slate-700">
          <p className="font-medium">Pagamento via Cartão de Crédito - Recorrência Automática via Revolut</p>
          <p className="text-xs mt-1 opacity-80">Seus dados são processados com segurança bancária.</p>
        </div>
      </div>
    </section>
  );
}
