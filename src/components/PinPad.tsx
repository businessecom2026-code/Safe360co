import { ShieldCheck, ArrowLeft, Copy, Check, AlertTriangle, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PinPadProps {
  onComplete: () => void;
}

export function PinPad({ onComplete }: PinPadProps) {
  const [pin, setPin] = useState<string>('');
  const [step, setStep] = useState<'input' | 'master-key'>('input');
  const [masterKey, setMasterKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate Master Key
  const generateMasterKey = () => {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SAFE-${part1}-${part2}`;
  };

  const handleNumberClick = (num: number) => {
    if (pin.length < 8) {
      setPin(prev => prev + num.toString());
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (pin.length >= 4) {
      setMasterKey(generateMasterKey());
      setStep('master-key');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Simulate slight delay before entering
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 'input') return;

      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 8) {
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, step]);

  if (step === 'master-key') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 p-8 relative">
          
          {/* Email Alert */}
          <div className="absolute top-0 left-0 right-0 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-green-100 dark:border-green-900/30">
            <Mail size={14} />
            <span>🛡️ Modelo 1: E-mail de boas-vindas enviado com sua Master Key</span>
          </div>

          <div className="mt-6 text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Atenção Crítica</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Guarde esta chave em local seguro. Ela é o único meio de recuperar seus dados se esquecer o PIN.
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-6 mb-8 text-center border border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Sua Master Key</p>
            <code className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider select-all">
              {masterKey}
            </code>
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={20} />
                Copiado! Entrando...
              </>
            ) : (
              <>
                <Copy size={20} />
                Copiar Chave e Entrar
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6 animate-pulse">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Segurança Safe360</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crie seu PIN de acesso (4 a 8 dígitos).
          </p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-10 h-8">
          {Array.from({ length: 8 }).map((_, index) => {
            if (index < pin.length) {
              return (
                <div
                  key={index}
                  className="w-3 h-3 rounded-full bg-blue-600 animate-in zoom-in duration-200"
                />
              );
            }
            // Only show placeholders up to 4, or current length + 1 to hint availability
            if (index < 4 || index === pin.length) {
               return (
                <div
                  key={index}
                  className="w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-700 transition-colors"
                />
              );
            }
            return null;
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="w-16 h-16 rounded-full text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center active:scale-95"
            >
              {num}
            </button>
          ))}
          <div className="w-16 h-16 flex items-center justify-center">
             {/* Empty or maybe a clear button? Keeping empty for standard layout */}
          </div>
          <button
            onClick={() => handleNumberClick(0)}
            className="w-16 h-16 rounded-full text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center active:scale-95 hover:text-red-500"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={pin.length < 4}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200
            ${pin.length >= 4
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02]' 
              : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
            }`}
        >
          Confirmar PIN
        </button>
      </div>
    </div>
  );
}
