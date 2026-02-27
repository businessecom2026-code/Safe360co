import { Shield, Palette, Gem, LogOut, ChevronRight, Eye, KeyRound, Moon, Sun, Trash2, AlertTriangle, RefreshCw, CreditCard, Receipt, Download, Upload, Timer } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface SettingsProps {
  masterKey: string;
  userPin: string;
  onLogout: () => void;
  onPinChange: (newPin: string) => void;
  currentPlan: 'free' | 'pro' | 'scale';
  isProcessing: boolean;
  onUpgrade: () => void;
  onResetPlan: () => void;
  onSwitchToAdmin: () => void;
  transactions: { id: string; description: string; amount: string; date: string; icon: 'credit-card' | 'receipt' }[];
  activityLogs: { id: string; time: string; message: string }[];
}

export const PRICES = {
  extraUser: 2.00,
  scalePlan: 19.90,
  discount: 0.10
};

export const SettingsModal = ({ masterKey, userPin, onLogout, onPinChange, currentPlan, isProcessing, onUpgrade, onResetPlan, onSwitchToAdmin, transactions, activityLogs }: SettingsProps) => {
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
  
  const [autoLockTime, setAutoLockTime] = useState<number>(() => {
    const savedTime = localStorage.getItem('autoLockTime');
    return savedTime ? parseInt(savedTime, 10) : 300; // Padrão: 5 minutos
  });

  const handleAutoLockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timeInSeconds = parseInt(e.target.value, 10);
    setAutoLockTime(timeInSeconds);
    localStorage.setItem('autoLockTime', timeInSeconds.toString());
    
    let message = 'Bloqueio automático desativado.';
    if (timeInSeconds > 0) {
        message = `Bloqueio automático definido para ${timeInSeconds / 60} minuto(s).`;
    }
    showToast(message, 'success');
  };

  const [pinAttempts, setPinAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // ==========================================
  // GESTÃO DE USUÁRIOS (CONVIDADOS)
  // ==========================================
  const [guests, setGuests] = useState<{ id: string; email: string; vaults: string[] }[]>(() => {
    const saved = localStorage.getItem('extraUsers');
    return saved ? JSON.parse(saved) : [
      { id: '1', email: 'convidado@email.com', vaults: ['Social'] },
      { id: '2', email: 'socio@empresa.com', vaults: ['Bancos', 'Social'] }
    ];
  });

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleRemoveGuest = (email: string) => {
    const confirmDelete = window.confirm(
      'Tem certeza que deseja remover este usuário?\nO acesso dele será revogado imediatamente e o slot ficará livre.'
    );
    
    if (confirmDelete) {
      const updatedGuests = guests.filter(g => g.email !== email);
      setGuests(updatedGuests);
      localStorage.setItem('extraUsers', JSON.stringify(updatedGuests));
      window.dispatchEvent(new Event('storage'));
      showToast('👤 Acesso removido com sucesso', 'error');
      
      // Simula a revogação para o Guest (via localStorage)
      localStorage.setItem('guestRevoked', 'true');
    }
  };

  // ==========================================
  // BACKUP E RESTAURAÇÃO (JSON)
  // ==========================================
  const handleExportBackup = () => {
    const confirmExport = window.confirm(
      '⚠️ Este arquivo contém dados sensíveis. Guarde-o em um local seguro ou pen drive offline. Deseja continuar?'
    );

    if (confirmExport) {
      const backupData = {
        categories: localStorage.getItem('safe360_categories') ? JSON.parse(localStorage.getItem('safe360_categories')!) : [],
        items: localStorage.getItem('safe360_items') ? JSON.parse(localStorage.getItem('safe360_items')!) : [],
        extraUsers: guests,
        userPlan: currentPlan,
        masterKey: masterKey, // Apenas para referência, não descriptografa
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'safe360_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup gerado com sucesso!', 'success');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backupData = JSON.parse(text);

        // Validação básica do backup
        if (backupData.categories && backupData.items && backupData.extraUsers) {
          localStorage.setItem('safe360_categories', JSON.stringify(backupData.categories));
          localStorage.setItem('safe360_items', JSON.stringify(backupData.items));
          localStorage.setItem('extraUsers', JSON.stringify(backupData.extraUsers));
          localStorage.setItem('userPlan', backupData.userPlan || 'free');
          
          showToast('Backup restaurado com sucesso! A página será recarregada.', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showToast('Arquivo de backup inválido.', 'error');
        }
      } catch (error) {
        showToast('Erro ao ler o arquivo de backup.', 'error');
        console.error("Erro ao importar backup:", error);
      }
    };
    reader.readAsText(file);
  };

  // ==========================================
  // LÓGICA DE ASSINATURA E ARMAZENAMENTO
  // ==========================================
  const usedStorageMB = 40; // Exemplo de uso
  
  const planDetails = {
    free: { name: 'FREE', limit: 200, label: '200MB' },
    pro: { name: 'PRO', limit: 500, label: '500MB' },
    scale: { name: 'SCALE', limit: 2000, label: '2GB' }
  };
  
  const currentLimit = planDetails[currentPlan].limit;
  const currentLimitLabel = planDetails[currentPlan].label;
  const planName = planDetails[currentPlan].name;
  
  // Cálculo automático da porcentagem (limitado a 100% visualmente)
  const usagePercentage = Math.min(100, (usedStorageMB / currentLimit) * 100);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockTimeLeft > 0) {
      timer = setInterval(() => {
        setLockTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isLocked && lockTimeLeft === 0) {
      setIsLocked(false);
      setPinAttempts(0);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTimeLeft]);

  const handleFailedAttempt = (setError: (msg: string) => void) => {
    const newAttempts = pinAttempts + 1;
    setPinAttempts(newAttempts);
    if (newAttempts >= 3) {
      setIsLocked(true);
      setLockTimeLeft(30);
      setError('Muitas tentativas. Tente novamente em 30s.');
    } else {
      setError(`PIN incorreto. Tentativas restantes: ${3 - newAttempts}`);
    }
  };

  const handleRevealMasterKey = () => {
    if (isLocked) return;
    if (pinInput === userPin) {
      setShowPinConfirm(false);
      setShowMasterKey(true);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
    } else {
      handleFailedAttempt(setPinError);
      setPinInput('');
    }
  };

  const handleVerifyCurrentPin = () => {
    if (isLocked) return;
    if (currentPinInput === userPin) {
      setChangePinStep('new');
      setChangePinError('');
      setPinAttempts(0);
    } else {
      handleFailedAttempt(setChangePinError);
      setCurrentPinInput('');
    }
  };

  const handleSaveNewPin = () => {
    if (newPinInput === confirmNewPinInput) {
      onPinChange(newPinInput);
      setSuccessMessage('PIN alterado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowChangePin(false);
    } else {
      setChangePinError('Os PINs não coincidem.');
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

  const handleLogout = () => {
    sessionStorage.clear();
    onLogout();
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
            <div className="h-px bg-slate-200 dark:bg-slate-800 mx-4"></div>
            <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Timer size={20} className="text-slate-500" />
                    <span className="font-semibold">Bloqueio Automático</span>
                </div>
                <select 
                    value={autoLockTime} 
                    onChange={handleAutoLockChange}
                    className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-semibold py-1 px-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="0">Nunca</option>
                    <option value="60">1 Minuto</option>
                    <option value="300">5 Minutos</option>
                    <option value="900">15 Minutos</option>
                </select>
            </div>
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
            <div className="flex justify-between items-start mb-4">
              <div className="w-full pr-4 overflow-hidden">
                <p className="font-semibold mb-1">Plano Atual: <span className="text-blue-600">{planName}</span></p>
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{usedStorageMB}MB de {currentLimitLabel} usados</span>
                </div>
                {/* Barra de Progresso Slim */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
              </div>
              <Gem size={24} className="text-blue-500 flex-shrink-0 mt-1" />
            </div>
            
            {/* Botões Dinâmicos de Upgrade */}
            {currentPlan !== 'scale' && (
              <>
                <button onClick={onUpgrade} disabled={isProcessing} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                  {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : null}
                  {isProcessing ? 'Processando Pagamento...' : `Upgrade para ${currentPlan === 'free' ? 'PRO (500MB)' : 'SCALE (2GB)'}`}
                </button>
              </>
            )}
            {currentPlan === 'scale' && (
              <div className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold text-center text-sm">
                Plano Máximo Atingido
              </div>
            )}
            {currentPlan !== 'scale' && (
              <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
                Pagamento seguro via Revolut Checkout
              </p>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Histórico de Pagamentos</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhuma transação encontrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        {tx.icon === 'credit-card' ? <CreditCard size={18} /> : <Receipt size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-slate-500">{tx.date}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{tx.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usuários com Acesso */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Usuários com Acesso</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {guests.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhum usuário extra configurado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {guests.map((guest) => (
                  <div key={guest.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {guest.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        Acesso: <span className="text-blue-500 font-medium">{guest.vaults.join(', ')}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleRemoveGuest(guest.email)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      title="Revogar Acesso"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Atividade Recente</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {activityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhuma atividade registrada recentemente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="text-xs font-mono text-slate-400 mt-0.5 shrink-0">
                      [{log.time}]
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">
                      {log.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Backup e Restauração */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Backup de Segurança</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
            <button 
              onClick={handleExportBackup}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Download size={20} className="text-slate-500" />
                <span className="font-semibold">Baixar Backup de Segurança (.json)</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
            
            <label className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <Upload size={20} className="text-slate-500" />
                <span className="font-semibold">Importar Backup</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-12 px-4 space-y-3">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <LogOut size={16} />
            Sair da Conta
          </button>
          <button onClick={handleClearCache} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 dark:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors">
            <AlertTriangle size={16} />
            Limpar Cache do App
          </button>
          
          {/* Botão de Reset Temporário (Dev Only) */}
          <button onClick={onResetPlan} className="w-full flex items-center justify-center py-2 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mt-4">
            Resetar para Plano FREE (Dev Only)
          </button>
          
          {/* Botão de Switch para Admin (Dev Only) */}
          <button onClick={onSwitchToAdmin} className="w-full flex items-center justify-center py-2 text-[10px] font-medium text-blue-400 hover:text-blue-600 transition-colors mt-2">
            Forçar Modo Administrador (Dev Only)
          </button>
        </div>
      </div>

      {/* Feedback Visual de Sucesso */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-semibold z-[70] animate-fade-in-down">
          {successMessage}
        </div>
      )}

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
                <button onClick={handleRevealMasterKey} disabled={isLocked} className={`flex-1 py-3 text-white rounded-lg font-bold ${isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600'}`}>
                  {isLocked ? `Aguarde ${lockTimeLeft}s` : 'Confirmar'}
                </button>
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
                  <button onClick={handleVerifyCurrentPin} disabled={isLocked} className={`w-full py-3 text-white rounded-lg font-bold mt-4 ${isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600'}`}>
                    {isLocked ? `Aguarde ${lockTimeLeft}s` : 'Próximo'}
                  </button>
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
                  <button onClick={handleSaveNewPin} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold mt-4">Salvar Alterações</button>
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
