import { useState, useEffect } from 'react';
import { Fingerprint, Scan, Key, RefreshCw, Lock, ArrowLeft, X, ShieldCheck, Mail, AlertTriangle, Copy, Check } from 'lucide-react';
import { Language, translations } from '../translations';

interface PinPadProps {
  onComplete: (pin: string) => void;
  savedMasterKey?: string;
  onMasterKeyGenerated?: (key: string) => void;
  onRecoveryInitiated?: () => void;
  lang: Language;
}

export function PinPad({ onComplete, savedMasterKey, onMasterKeyGenerated, onRecoveryInitiated, lang }: PinPadProps) {
  const t = translations[lang];
  const [pin, setPin] = useState<string>('');
  const [step, setStep] = useState<'biometric' | 'input' | 'master-key' | 'recovery' | 'reset-pin'>('biometric');
  const [masterKey, setMasterKey] = useState(savedMasterKey || '');
  const [copied, setCopied] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [newPin, setNewPin] = useState('');

  // Biometric Simulation
  useEffect(() => {
    if (step === 'biometric') {
      setBiometricStatus('scanning');
      const timer = setTimeout(() => {
        setBiometricStatus('success');
        setTimeout(() => {
          setStep('input');
        }, 800); // 800ms for success state
      }, 2000); // 2s for scanning
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Generate Master Key
  const generateMasterKey = () => {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const key = `SAFE-${part1}-${part2}`;
    if (onMasterKeyGenerated) onMasterKeyGenerated(key);
    return key;
  };

  const handleNumberClick = (num: number) => {
    if (step === 'input' || step === 'reset-pin') {
      const currentPin = step === 'input' ? pin : newPin;
      const setter = step === 'input' ? setPin : setNewPin;
      
      if (currentPin.length < 8) {
        setter(prev => prev + num.toString());
      }
    }
  };

  const handleBackspace = () => {
    const setter = step === 'input' ? setPin : setNewPin;
    setter(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (step === 'input' && pin.length >= 4) {
      if (!savedMasterKey) {
        const key = generateMasterKey();
        setMasterKey(key);
        setStep('master-key');
      } else {
        onComplete(pin);
      }
    } else if (step === 'reset-pin' && newPin.length >= 4) {
      onComplete(newPin);
    }
  };

  const handleRecovery = () => {
    if (recoveryKey.toUpperCase() === masterKey.toUpperCase()) {
      setStep('reset-pin');
      setRecoveryError('');
    } else {
      setRecoveryError(t.pinpad.recovery.error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Simulate slight delay before entering
    setTimeout(() => {
      onComplete(pin);
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 'input' && step !== 'reset-pin') return;

      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(parseInt(e.key));
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, newPin, step]);

  if (step === 'biometric') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 dark bg-slate-900">
        <div className="w-full max-w-sm text-center">
          <div className="relative inline-block mb-8">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
              biometricStatus === 'scanning' ? 'border-blue-500 animate-pulse' : 'border-green-500 scale-110'
            }`}>
              {biometricStatus === 'scanning' ? (
                <Scan size={64} className="text-blue-500 animate-bounce" />
              ) : (
                <Fingerprint size={64} className="text-green-500" />
              )}
            </div>
            {biometricStatus === 'scanning' && (
              <div className="absolute inset-0 border-t-4 border-blue-400 rounded-full animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {biometricStatus === 'scanning' ? t.pinpad.biometric.scanning : t.pinpad.biometric.success}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t.pinpad.biometric.subtitle}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'recovery') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 dark bg-slate-900">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-8">
          <button onClick={() => setStep('input')} className="mb-6 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> {lang === 'pt' ? 'Voltar' : lang === 'en' ? 'Back' : 'Volver'}
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
              <Key size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.pinpad.recovery.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.pinpad.recovery.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder={t.pinpad.recovery.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-center uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {recoveryError && (
              <p className="text-red-500 text-xs text-center font-medium">{recoveryError}</p>
            )}
            <button
              onClick={handleRecovery}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              {t.pinpad.recovery.submit}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'master-key') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 dark bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 p-8 relative">
          
          {/* Email Alert */}
          <div className="absolute top-0 left-0 right-0 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-green-100 dark:border-green-900/30">
            <Mail size={14} />
            <span>{t.pinpad.masterKey.alert}</span>
          </div>

          <div className="mt-6 text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.pinpad.masterKey.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.pinpad.masterKey.subtitle}
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-6 mb-8 text-center border border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{t.pinpad.masterKey.label}</p>
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
                {t.pinpad.masterKey.copied}
              </>
            ) : (
              <>
                <Copy size={20} />
                {t.pinpad.masterKey.submit}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const currentDisplayPin = step === 'reset-pin' ? newPin : pin;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 dark bg-slate-900 overflow-hidden">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6 relative">
            <ShieldCheck size={32} />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
              <Fingerprint size={16} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'reset-pin' ? t.pinpad.reset.title : t.pinpad.input.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {step === 'reset-pin' ? t.pinpad.reset.subtitle : (savedMasterKey ? t.pinpad.input.subtitle : t.pinpad.input.createSubtitle)}
          </p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-4 h-8">
          {Array.from({ length: 8 }).map((_, index) => {
            if (index < currentDisplayPin.length) {
              return (
                <div
                  key={index}
                  className="w-3 h-3 rounded-full bg-blue-600 animate-in zoom-in duration-200"
                />
              );
            }
            if (index < 4 || index === currentDisplayPin.length) {
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

        <div className="grid grid-cols-3 gap-1 max-w-[240px] mx-auto mb-4">
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
             <Fingerprint size={24} className="text-gray-300 dark:text-slate-700" />
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

        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={currentDisplayPin.length < 4}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200
              ${currentDisplayPin.length >= 4
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02]' 
                : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
              }`}
          >
            {step === 'reset-pin' ? t.pinpad.reset.submit : t.pinpad.input.confirm}
          </button>

          {step === 'input' && savedMasterKey && (
            <button
              onClick={() => {
                setStep('recovery');
                if (onRecoveryInitiated) onRecoveryInitiated();
              }}
              className="w-full py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              {t.pinpad.input.forgot}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
