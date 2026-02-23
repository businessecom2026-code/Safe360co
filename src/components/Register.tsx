import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useState, FormEvent } from 'react';

interface RegisterProps {
  onBack: () => void;
  onSuccess: () => void;
  onLogin: () => void;
}

export function Register({ onBack, onSuccess, onLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-8">
          <button 
            onClick={onBack}
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            Voltar
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Crie sua conta</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Comece a proteger seu e-commerce hoje.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome completo
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail profissional
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="voce@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <input
                type="password"
                id="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <div className="flex items-center h-5">
                <input
                  id="lgpd"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:ring-offset-slate-800 cursor-pointer"
                />
              </div>
              <label htmlFor="lgpd" className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                Li e aceito os termos da GDPR (Europa) e LGPD (Brasil).
              </label>
            </div>

            <button
              type="submit"
              disabled={!acceptedTerms || isLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2
                ${acceptedTerms && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02]' 
                  : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
                }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Cadastrar
                  <Check size={18} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Já tem uma conta? <button onClick={onLogin} className="text-blue-600 font-medium hover:underline">Fazer Login</button>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
            <span>Em conformidade com GDPR (EU) e LGPD (BR)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
