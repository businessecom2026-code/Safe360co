import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Nova Versão 2.0 Disponível
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-8">
            Segurança total para o seu <span className="text-blue-600 dark:text-blue-400">E-commerce</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
            Proteja seus dados e de seus clientes com a plataforma mais avançada de conformidade e segurança digital. Simples, rápido e seguro.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-blue-600/20"
            >
              Começar Agora
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Setup em 5 min</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Pagamento via cartão</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Cancelamento grátis</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000"></div>
      </div>
    </section>
  );
}
