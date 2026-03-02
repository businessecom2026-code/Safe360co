import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Key, ArrowLeft, ShieldCheck, Mail, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import { Language, translations } from '../translations';
import {
  hashPin,
  isMobileDevice,
  platformAuthAvailable,
  registerPasskey,
  assertPasskey,
  PinStore,
} from '../utils/pinUtils';

type Step = 'checking' | 'biometric' | 'biometric-setup' | 'input' | 'master-key' | 'recovery' | 'reset-pin';

interface PinPadProps {
  onComplete: (pin: string) => void;
  savedMasterKey?: string;
  onMasterKeyGenerated?: (key: string) => void;
  onRecoveryInitiated?: () => void;
  lang: Language;
  userId?: string;
}

// Inline i18n for strings not yet in translations.ts
const BIO_STRINGS = {
  title:         { pt: 'Verificação Biométrica',             ptPT: 'Verificação Biométrica',               en: 'Biometric Verification',        enGB: 'Biometric Verification',        es: 'Verificación Biométrica',  it: 'Verifica Biometrica',          fr: 'Vérification Biométrique',          de: 'Biometrische Prüfung',             uk: 'Біометрична перевірка',        zh: '生物识别验证'    },
  tapToAuth:     { pt: 'Use Face ID ou impressão digital',   ptPT: 'Use Face ID ou impressão digital',     en: 'Use Face ID or fingerprint',    enGB: 'Use Face ID or fingerprint',    es: 'Usa Face ID o huella digital', it: 'Usa Face ID o impronta digitale', fr: 'Utilisez Face ID ou empreinte',     de: 'Face ID oder Fingerabdruck',       uk: 'Використайте Face ID або відбиток', zh: '使用面容ID或指纹' },
  activate:      { pt: 'Usar Face ID / Touch ID',            ptPT: 'Usar Face ID / Touch ID',              en: 'Use Face ID / Touch ID',        enGB: 'Use Face ID / Touch ID',        es: 'Usar Face ID / Touch ID',      it: 'Usa Face ID / Touch ID',          fr: 'Utiliser Face ID / Touch ID',       de: 'Face ID / Touch ID verwenden',     uk: 'Використати Face ID / Touch ID',    zh: '使用面容ID/触控ID' },
  usePin:        { pt: 'Usar PIN em vez disso',              ptPT: 'Usar PIN em vez disso',                en: 'Use PIN instead',               enGB: 'Use PIN instead',               es: 'Usar PIN en su lugar',         it: 'Usa il PIN',                      fr: 'Utiliser le PIN',                   de: 'PIN verwenden',                    uk: 'Використати PIN',                   zh: '改用PIN码' },
  failed:        { pt: 'Falha na biometria. Use o PIN.',     ptPT: 'Falha na biometria. Use o PIN.',       en: 'Biometric failed. Use PIN.',    enGB: 'Biometric failed. Use PIN.',    es: 'Falló biometría. Usa el PIN.', it: 'Biometria fallita. Usa il PIN.',  fr: 'Biométrie échouée. Utilisez le PIN.', de: 'Biometrie fehlgeschlagen. PIN.',  uk: 'Біометрія не вдалася. PIN.',        zh: '生物识别失败，使用PIN码' },
  setupTitle:    { pt: 'Ativar Face ID / Touch ID?',         ptPT: 'Ativar Face ID / Touch ID?',           en: 'Enable Face ID / Touch ID?',   enGB: 'Enable Face ID / Touch ID?',   es: '¿Activar Face ID / Touch ID?', it: 'Attivare Face ID / Touch ID?',    fr: 'Activer Face ID / Touch ID?',       de: 'Face ID / Touch ID aktivieren?',   uk: 'Увімкнути Face ID / Touch ID?',     zh: '启用面容ID/触控ID?' },
  setupSub:      { pt: 'Entre mais rápido com reconhecimento facial ou digital na próxima vez.', ptPT: 'Entre mais rápido com reconhecimento facial ou digital na próxima vez.', en: 'Sign in faster with facial or fingerprint recognition next time.', enGB: 'Sign in faster with facial or fingerprint recognition next time.', es: 'Inicia sesión más rápido la próxima vez.', it: 'Accedi più velocemente la prossima volta.', fr: 'Connectez-vous plus rapidement la prochaine fois.', de: 'Melden Sie sich beim nächsten Mal schneller an.', uk: 'Входьте швидше наступного разу.', zh: '下次可更快速登录。' },
  setupActivate: { pt: 'Ativar',    ptPT: 'Ativar',    en: 'Enable',   enGB: 'Enable',   es: 'Activar',  it: 'Attiva',   fr: 'Activer',  de: 'Aktivieren', uk: 'Увімкнути', zh: '启用' },
  setupSkip:     { pt: 'Agora não', ptPT: 'Agora não', en: 'Not now',  enGB: 'Not now',  es: 'Ahora no', it: 'Non ora',  fr: 'Pas maintenant', de: 'Nicht jetzt', uk: 'Не зараз', zh: '暂不设置' },
  wrongPin:      { pt: 'PIN incorreto. Tente novamente.', ptPT: 'PIN incorreto. Tente novamente.', en: 'Wrong PIN. Try again.', enGB: 'Wrong PIN. Try again.', es: 'PIN incorrecto. Inténtalo de nuevo.', it: 'PIN errato. Riprova.', fr: 'PIN incorrect. Réessayez.', de: 'Falscher PIN. Erneut versuchen.', uk: 'Невірний PIN. Спробуйте ще раз.', zh: 'PIN错误，请重试。' },
  back:          { pt: 'Voltar',    ptPT: 'Voltar',    en: 'Back',     enGB: 'Back',     es: 'Volver',   it: 'Indietro', fr: 'Retour',   de: 'Zurück',     uk: 'Назад',     zh: '返回' },
} as const;

export function PinPad({ onComplete, savedMasterKey, onMasterKeyGenerated, onRecoveryInitiated, lang, userId }: PinPadProps) {
  const t = translations[lang];
  const L = (map: Record<string, string>) => map[lang] ?? map['en'];

  const [step, setStep]               = useState<Step>('checking');
  const [pin, setPin]                 = useState('');
  const [newPin, setNewPin]           = useState('');
  const [masterKey, setMasterKey]     = useState(savedMasterKey || '');
  const [copied, setCopied]           = useState(false);
  const [pinError, setPinError]       = useState('');
  const [bioLoading, setBioLoading]   = useState(false);
  const [bioError, setBioError]       = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Sync savedMasterKey → local state when prop loads after session restore
  useEffect(() => {
    if (savedMasterKey && !masterKey) setMasterKey(savedMasterKey);
  }, [savedMasterKey]);

  // ─── Step: checking ── determine biometric vs PIN based on device + enrollment
  useEffect(() => {
    if (step !== 'checking') return;

    (async () => {
      if (!isMobileDevice()) {
        // Desktop: never prompt biometrics
        setStep('input');
        return;
      }
      // Mobile: only offer biometric if user has already enrolled a passkey
      if (userId) {
        const credId = PinStore.getCredId(userId);
        if (credId && await platformAuthAvailable()) {
          setStep('biometric');
          return;
        }
      }
      setStep('input');
    })();
  }, [step, userId]);

  // Whether this user already has a PIN registered
  const isReturningUser = !!(userId && PinStore.getPinHash(userId));

  // ─── Master key generator ──────────────────────────────────────────────────
  const generateMasterKey = useCallback(() => {
    const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const key = `SAFE-${p1}-${p2}`;
    if (onMasterKeyGenerated) onMasterKeyGenerated(key);
    return key;
  }, [onMasterKeyGenerated]);

  // ─── Biometric auth ────────────────────────────────────────────────────────
  const handleBiometricAuth = async () => {
    if (!userId) { setStep('input'); return; }
    const credId = PinStore.getCredId(userId);
    if (!credId) { setStep('input'); return; }

    setBioLoading(true);
    setBioError('');
    try {
      await assertPasskey(credId);
      onComplete('__webauthn__');
    } catch {
      setBioError(L(BIO_STRINGS.failed));
      setBioLoading(false);
      setTimeout(() => setStep('input'), 1500);
    }
  };

  // ─── PIN confirm (async — hash verification) ───────────────────────────────
  const handleConfirm = useCallback(async () => {
    const currentPin = step === 'reset-pin' ? newPin : pin;
    if (currentPin.length < 4) return;

    if (step === 'reset-pin') {
      if (userId) {
        const hash = await hashPin(userId, newPin);
        PinStore.setPinHash(userId, hash);
      }
      onComplete(newPin);
      return;
    }

    // ── step === 'input' ──
    if (userId) {
      const storedHash = PinStore.getPinHash(userId);

      if (storedHash) {
        // Returning user: verify PIN
        const inputHash = await hashPin(userId, pin);
        if (inputHash !== storedHash) {
          setPinError(L(BIO_STRINGS.wrongPin));
          setPin('');
          return;
        }
        setPinError('');
        onComplete(pin);
        return;
      }

      // First-time user: store hash now
      const hash = await hashPin(userId, pin);
      PinStore.setPinHash(userId, hash);
    }

    // First time: generate master key (only if none exists yet)
    if (!masterKey) {
      const key = generateMasterKey();
      setMasterKey(key);
      if (userId) PinStore.setMasterKey(userId, key);
      setStep('master-key');
    } else {
      // savedMasterKey existed but pinHash was missing (edge case after data clear)
      onComplete(pin);
    }
  }, [step, pin, newPin, userId, masterKey, generateMasterKey, onComplete]);

  // ─── After master key is copied → decide next step ────────────────────────
  const afterMasterKey = useCallback(async () => {
    // Offer biometric enrollment on mobile if not yet enrolled
    if (userId && isMobileDevice() && await platformAuthAvailable() && !PinStore.getCredId(userId)) {
      setStep('biometric-setup');
    } else {
      onComplete(pin);
    }
  }, [userId, pin, onComplete]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterKey);
    setCopied(true);
    setTimeout(() => afterMasterKey(), 800);
  };

  // ─── Biometric enrollment ──────────────────────────────────────────────────
  const handleRegisterBiometric = async () => {
    if (!userId) { onComplete(pin); return; }
    setSetupLoading(true);
    try {
      const credId = await registerPasskey(userId);
      PinStore.setCredId(userId, credId);
    } catch {
      // user cancelled — proceed without biometric, no error shown
    } finally {
      setSetupLoading(false);
      onComplete(pin);
    }
  };

  // ─── Number pad ───────────────────────────────────────────────────────────
  const handleNumberClick = (num: number) => {
    if (step !== 'input' && step !== 'reset-pin') return;
    const current = step === 'input' ? pin : newPin;
    if (current.length >= 8) return;
    if (step === 'input') setPin(p => p + num);
    else setNewPin(p => p + num);
    if (pinError) setPinError('');
  };

  const handleBackspace = () => {
    if (step === 'input') setPin(p => p.slice(0, -1));
    else setNewPin(p => p.slice(0, -1));
  };

  // ─── Keyboard listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step !== 'input' && step !== 'reset-pin') return;
      if (e.key >= '0' && e.key <= '9') handleNumberClick(parseInt(e.key));
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleConfirm, step, pin, newPin]);

  const currentDisplayPin = step === 'reset-pin' ? newPin : pin;

  // ─── Checking ─────────────────────────────────────────────────────────────
  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 size={36} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  // ─── Biometric auth ────────────────────────────────────────────────────────
  if (step === 'biometric') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
        <div className="w-full max-w-sm text-center">
          <div className="relative inline-block mb-8">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
              bioLoading ? 'border-blue-500' : 'border-blue-300 dark:border-blue-700'
            }`}>
              {bioLoading
                ? <Loader2 size={64} className="text-blue-500 animate-spin" />
                : <Fingerprint size={64} className="text-blue-500" />
              }
            </div>
            {bioLoading && (
              <div className="absolute inset-0 border-t-4 border-blue-400 rounded-full animate-spin" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {L(BIO_STRINGS.title)}
          </h2>
          <p className={`mb-8 text-sm ${bioError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {bioError || L(BIO_STRINGS.tapToAuth)}
          </p>

          {!bioLoading && (
            <div className="space-y-3">
              <button
                onClick={handleBiometricAuth}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Fingerprint size={20} />
                {L(BIO_STRINGS.activate)}
              </button>
              <button
                onClick={() => setStep('input')}
                className="w-full py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              >
                {L(BIO_STRINGS.usePin)}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Biometric setup offer ─────────────────────────────────────────────────
  if (step === 'biometric-setup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 mb-6 mx-auto">
            <Fingerprint size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {L(BIO_STRINGS.setupTitle)}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {L(BIO_STRINGS.setupSub)}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRegisterBiometric}
              disabled={setupLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {setupLoading
                ? <Loader2 size={20} className="animate-spin" />
                : <Fingerprint size={20} />
              }
              {L(BIO_STRINGS.setupActivate)}
            </button>
            <button
              onClick={() => onComplete(pin)}
              className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {L(BIO_STRINGS.setupSkip)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Recovery ─────────────────────────────────────────────────────────────
  if (step === 'recovery') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 bg-gray-50 dark:bg-slate-900">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-8">
          <button
            onClick={() => setStep('input')}
            className="mb-6 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            {L(BIO_STRINGS.back)}
          </button>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
              <Key size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.pinpad.recovery.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.pinpad.recovery.subtitle}</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={recoveryKey}
              onChange={e => setRecoveryKey(e.target.value)}
              placeholder={t.pinpad.recovery.placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-center uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {recoveryError && <p className="text-red-500 text-xs text-center font-medium">{recoveryError}</p>}
            <button
              onClick={() => {
                if (recoveryKey.toUpperCase() === masterKey.toUpperCase()) {
                  setRecoveryError('');
                  setStep('reset-pin');
                } else {
                  setRecoveryError(t.pinpad.recovery.error);
                }
              }}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              {t.pinpad.recovery.submit}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Master key display ────────────────────────────────────────────────────
  if (step === 'master-key') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 bg-gray-50 dark:bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden p-8 relative">
          <div className="absolute top-0 left-0 right-0 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-green-100 dark:border-green-900/30">
            <Mail size={14} />
            <span>{t.pinpad.masterKey.alert}</span>
          </div>
          <div className="mt-6 text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.pinpad.masterKey.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.pinpad.masterKey.subtitle}</p>
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
            {copied
              ? <><Check size={20} />{t.pinpad.masterKey.copied}</>
              : <><Copy size={20} />{t.pinpad.masterKey.submit}</>
            }
          </button>
        </div>
      </div>
    );
  }

  // ─── PIN input (input + reset-pin) ────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500 bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden p-8">
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
            {step === 'reset-pin'
              ? t.pinpad.reset.subtitle
              : (isReturningUser ? t.pinpad.input.subtitle : t.pinpad.input.createSubtitle)
            }
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-2 h-8">
          {Array.from({ length: 8 }).map((_, i) => {
            if (i < currentDisplayPin.length) return <div key={i} className="w-3 h-3 rounded-full bg-blue-600 animate-in zoom-in duration-200" />;
            if (i < 4 || i === currentDisplayPin.length) return <div key={i} className="w-3 h-3 rounded-full bg-gray-200 dark:bg-slate-700" />;
            return null;
          })}
        </div>

        {/* Error */}
        <div className="h-5 mb-2 text-center">
          {pinError && <p className="text-red-500 text-xs font-medium">{pinError}</p>}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-1 max-w-[240px] mx-auto mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
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
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 ${
              currentDisplayPin.length >= 4
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02]'
                : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            {step === 'reset-pin' ? t.pinpad.reset.submit : t.pinpad.input.confirm}
          </button>

          {step === 'input' && isReturningUser && (
            <button
              onClick={() => { setStep('recovery'); if (onRecoveryInitiated) onRecoveryInitiated(); }}
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

export default PinPad;
