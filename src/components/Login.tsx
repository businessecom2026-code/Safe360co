import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { useState, FormEvent } from 'react';

interface LoginProps {
  onBack: () => void;
  onSuccess: () => void;
  onRegister: () => void;
}

export function Login({ onBack, onSuccess, onRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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
              <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Acesse sua conta segura.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Não tem uma conta? <button onClick={onRegister} className="text-blue-600 font-medium hover:underline">Cadastre-se</button>
          </p>
        </div>
      </div>
    </div>
  );
}
