import { Shield, Palette, Gem, LogOut, ChevronRight, Eye, KeyRound, Moon, Sun, Trash2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsProps {
  masterKey: string;
  userPin: string;
  onLogout: () => void;
  onPinChange: (newPin: string) => void;
}

export function Settings({ masterKey, userPin, onLogout, onPinChange }: SettingsProps) {
  const [isDark, setIsDark] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showChangePin, setShowChangePin] = useState(false);
  const [changePinStep, setChangePinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');

  const handleRevealMasterKey = () => {
    if (pinInput === userPin) {
      setShowPinConfirm(false);
      setShowMasterKey(true);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN incorreto. Tente novamente.');
      setPinInput('');
    }
  };

  const openPinConfirm = () => {
    setShowPinConfirm(true);
    setShowMasterKey(false);
    setPinInput('');
    setPinError('');
  };

  const openChangePin = () => {
    setShowChangePin(true);
    setChangePinStep('current');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmNewPinInput('');
    setChangePinError('');
  };

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  };

  const handleClearCache = () => {
    if (window.confirm('Tem certeza que deseja limpar o cache? Isso irá desconectá-lo e apagar dados não sincronizados.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <>
      <div className="w-full max-w-lg mx-auto pb-24">
        {/* Seção Segurança */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Segurança</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button onClick={openPinConfirm} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <Eye size={20} className="text-slate-500" />
                <span className="font-semibold">Revelar Master Key</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-800 mx-4"></div>
            <button onClick={openChangePin} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <KeyRound size={20} className="text-slate-500" />
                <span className="font-semibold">Alterar PIN de Acesso</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Seção Aparência */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Aparência</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Palette size={20} className="text-slate-500" />
                <span className="font-semibold">Modo Escuro</span>
              </div>
              <button onClick={toggleDarkMode} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Seção Assinatura */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Assinatura</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-semibold">Plano Atual: <span className="text-blue-600">Básico</span></p>
                <p className="text-sm text-slate-500">100MB de Armazenamento</p>
              </div>
              <Gem size={24} className="text-blue-500" />
            </div>
            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
              Upgrade para Plano SCALE (10% OFF Anual)
            </button>
          </div>
        </div>

        {/* Botão de Emergência */}
        <div className="mt-12 px-4">
           <button onClick={handleClearCache} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 dark:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors">
              <AlertTriangle size={16} />
              Limpar Cache do App
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de PIN */}
      {showPinConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Confirmação de Segurança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu PIN para continuar.</p>
              <input 
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={8}
                className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
              />
              {pinError && <p className="text-red-500 text-xs mb-4">{pinError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowPinConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold">Cancelar</button>
                <button onClick={handleRevealMasterKey} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exibição da Master Key */}
      {showMasterKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Sua Master Key</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Guarde esta chave em um local seguro. Ela é a única forma de recuperar seu acesso.</p>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mb-4 font-mono text-blue-500 select-all">
                {masterKey}
              </div>
              <button onClick={() => setShowMasterKey(false)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold">Fechar</button>
            </div>
          </div>
        </div>
      )}
          {/* Modal de Alteração de PIN */}
      {showChangePin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Alterar PIN</h3>
              {/* Etapa 1: Inserir PIN Atual */}
              {changePinStep === 'current' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu PIN atual para continuar.</p>
                  <input type="password" value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value)} maxLength={8} className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                  {changePinError && <p className="text-red-500 text-xs mb-4">{changePinError}</p>}
                  <button onClick={() => { if (currentPinInput === userPin) { setChangePinStep('new'); setChangePinError(''); } else { setChangePinError('PIN atual incorreto.'); } }} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold mt-4">Próximo</button>
                </>
              )}
              {/* Etapa 2: Inserir Novo PIN */}
              {changePinStep === 'new' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu novo PIN (4-8 dígitos).</p>
                  <input type="password" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} maxLength={8} className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                  <button onClick={() => { if (newPinInput.length >= 4) { setChangePinStep('confirm'); } }} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold mt-4">Próximo</button>
                </>
              )}
              {/* Etapa 3: Confirmar Novo PIN */}
              {changePinStep === 'confirm' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Confirme seu novo PIN.</p>
                  <input type="password" value={confirmNewPinInput} onChange={(e) => setConfirmNewPinInput(e.target.value)} maxLength={8} className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                  {changePinError && <p className="text-red-500 text-xs mb-4">{changePinError}</p>}
                  <button onClick={() => { if (newPinInput === confirmNewPinInput) { onPinChange(newPinInput); alert('PIN alterado com sucesso!'); setShowChangePin(false); } else { setChangePinError('Os PINs não coincidem.'); } }} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold mt-4">Salvar Alterações</button>
                </>
              )}
              <button onClick={() => setShowChangePin(false)} className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 mt-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
