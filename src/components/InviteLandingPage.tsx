import { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface InviteLandingPageProps {
  adminName?: string;
  sharedVaults?: string[];
  onActivate: (pin: string) => void;
}

export const InviteLandingPage = ({ 
  adminName = 'O Administrador', 
  sharedVaults = ['Bancos', 'Social'],
  onActivate 
}: InviteLandingPageProps) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'welcome' | 'create-pin' | 'success'>('welcome');
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const handleNext = () => {
    setStep('create-pin');
  };

  const handleActivate = () => {
    if (pin.length < 4 || pin.length > 8) {
      setError('O PIN deve ter entre 4 e 8 dígitos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Os PINs não coincidem.');
      return;
    }

    setError('');
    setIsActivating(true);

    // Simula o tempo de ativação e criptografia
    setTimeout(() => {
      setStep('success');
      setIsActivating(false);
      
      // Aguarda um momento para o usuário ver a tela de sucesso antes de redirecionar
      setTimeout(() => {
        onActivate(pin);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-blue-500/30">
      
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[600px] max-h-[600px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 animate-fade-in-down">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <span className="font-bold text-3xl tracking-tight text-white">Safe360</span>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 w-full shadow-2xl animate-fade-in-up">
          
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="text-blue-500" size={28} />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-white mb-3 leading-tight">Você recebeu um acesso seguro!</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  <strong className="text-slate-200">{adminName}</strong> liberou acesso aos cofres de <span className="text-blue-400 font-medium">{sharedVaults.join(' e ')}</span>.
                </p>
              </div>

              <button 
                onClick={handleNext}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-4"
              >
                Configurar meu acesso
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'create-pin' && (
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Crie seu PIN de Acesso</h2>
                <p className="text-slate-400 text-sm">Este PIN será usado apenas por você para acessar o cofre compartilhado.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <input 
                    type="password" 
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Digite um PIN (4 a 8 dígitos)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <input 
                    type="password" 
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Confirme o PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm font-medium animate-shake">{error}</p>
              )}

              <button 
                onClick={handleActivate}
                disabled={!pin || !confirmPin || isActivating}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isActivating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Ativar Meu Acesso Seguro'
                )}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-4 animate-fade-in-up">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-emerald-500" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white">Acesso Liberado!</h2>
              <p className="text-slate-400 text-sm">Seu cofre está sendo preparado...</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs mt-8 font-medium">
          Criptografia de Ponta a Ponta • Safe360
        </p>
      </div>
    </div>
  );
};
