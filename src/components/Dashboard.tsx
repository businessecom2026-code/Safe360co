import { ShieldCheck, LogOut, Plus, RefreshCw, Settings, ArrowLeft, Trash2, FileText, Lock, Check, XCircle, Clock, UserPlus, Copy, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { initiateRevolutPay } from '../services/revolut';
import { SettingsModal } from './SettingsModal';

interface VaultItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Vault {
  id: string;
  name: string;
  userId: string;
  status?: 'active' | 'pending';
  data: VaultItem[];
}

interface DashboardProps {
  onLogout: () => void;
  onAdminConsole?: () => void;
  user: User | null;
}

export function Dashboard({ onLogout, onAdminConsole, user }: DashboardProps) {
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [newVaultName, setNewVaultName] = useState('');
  const [showAddVault, setShowAddVault] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Settings view
  const [showSettings, setShowSettings] = useState(false);
  const [userPin, setUserPin] = useState(() => {
    const saved = localStorage.getItem('safe360_pin');
    if (saved) return saved;
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('safe360_pin', randomPin);
    return randomPin;
  });
  const [masterKey] = useState(() => {
    const saved = localStorage.getItem('safe360_masterKey');
    if (saved) return saved;
    const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const key = `SAFE-${seg()}-${seg()}-${seg()}`;
    localStorage.setItem('safe360_masterKey', key);
    return key;
  });

  // Add item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Delete vault modal (PIN required)
  const [deleteTarget, setDeleteTarget] = useState<Vault | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  // Guest invite state
  const [guests, setGuests] = useState<Array<{ id: string; email: string; activated: boolean; createdAt: string }>>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStep, setInviteStep] = useState<'email' | 'payment' | 'success'>('email');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchVaults = async () => {
    if (!token || !user) return;
    try {
      const response = await fetch('/api/vaults', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setVaults(await response.json());
      } else {
        showToast('Falha ao carregar cofres.', 'error');
      }
    } catch {
      showToast('Falha ao carregar cofres.', 'error');
    }
  };

  const fetchGuests = async () => {
    if (!token || user?.role === 'guest') return;
    try {
      const response = await fetch('/api/auth/guests', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setGuests(await response.json());
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchVaults(); fetchGuests(); }, [user]);

  const handleCreateVault = async () => {
    if (!token || !newVaultName.trim()) return;
    try {
      const response = await fetch('/api/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newVaultName }),
      });
      if (response.ok) {
        await fetchVaults();
        setNewVaultName('');
        setShowAddVault(false);
        showToast(user?.role === 'guest' ? 'Cofre criado! Aguardando aprovacao do owner.' : 'Cofre criado com sucesso!');
      } else {
        const err = await response.json();
        showToast(`Erro: ${err.message}`, 'error');
      }
    } catch {
      showToast('Falha ao criar o cofre.', 'error');
    }
  };

  const openVault = async (vault: Vault) => {
    setSelectedVault(vault);
    setLoadingItems(true);
    try {
      const response = await fetch(`/api/vaults/${vault.id}/items`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setVaultItems(await response.json());
      } else {
        setVaultItems(vault.data || []);
      }
    } catch {
      setVaultItems(vault.data || []);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedVault || !token || !newItemTitle.trim()) return;
    try {
      const response = await fetch(`/api/vaults/${selectedVault.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newItemTitle, description: newItemDesc }),
      });
      if (response.ok) {
        const item = await response.json();
        setVaultItems(prev => [...prev, item]);
        setNewItemTitle('');
        setNewItemDesc('');
        setShowAddItem(false);
        showToast('Item salvo com sucesso!');
      } else {
        showToast('Erro ao salvar item.', 'error');
      }
    } catch {
      showToast('Falha ao salvar item.', 'error');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedVault || !token) return;
    try {
      const response = await fetch(`/api/vaults/${selectedVault.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setVaultItems(prev => prev.filter(i => i.id !== itemId));
        showToast('Item excluido.');
      }
    } catch {
      showToast('Erro ao excluir item.', 'error');
    }
  };

  const handleDeleteVault = async () => {
    if (!deleteTarget || !token || deletePin.length < 4) return;
    try {
      const response = await fetch(`/api/vaults/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pin: deletePin }),
      });
      if (response.ok) {
        setVaults(prev => prev.filter(v => v.id !== deleteTarget.id));
        if (selectedVault?.id === deleteTarget.id) {
          setSelectedVault(null);
          setVaultItems([]);
        }
        setDeleteTarget(null);
        setDeletePin('');
        setDeleteError('');
        showToast('Cofre excluido permanentemente.');
      } else {
        setDeleteError('PIN invalido ou erro ao excluir.');
      }
    } catch {
      setDeleteError('Falha na exclusao.');
    }
  };

  const handleApproveVault = async (vaultId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/vaults/${vaultId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchVaults();
        showToast('Cofre aprovado!');
      }
    } catch {
      showToast('Erro ao aprovar.', 'error');
    }
  };

  const handleRejectVault = async (vaultId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/vaults/${vaultId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchVaults();
        showToast('Cofre rejeitado.');
      }
    } catch {
      showToast('Erro ao rejeitar.', 'error');
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInviteGuest = () => {
    if (!inviteEmail.trim()) return;
    setInviteStep('payment');
  };

  const handlePaymentConfirm = () => {
    setInviteLoading(true);
    initiateRevolutPay(
      200, // EUR 2.00 in cents
      'EUR',
      async () => {
        // Payment success -> create guest
        try {
          const response = await fetch('/api/auth/invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ email: inviteEmail }),
          });
          if (response.ok) {
            const data = await response.json();
            setInviteLink(data.inviteLink);
            setInviteStep('success');
            fetchGuests();
          } else {
            const err = await response.json();
            showToast(`Erro: ${err.message}`, 'error');
            setInviteStep('email');
          }
        } catch {
          showToast('Erro ao criar convite.', 'error');
          setInviteStep('email');
        } finally {
          setInviteLoading(false);
        }
      },
      () => {
        showToast('Pagamento cancelado ou falhou.', 'error');
        setInviteLoading(false);
        setInviteStep('email');
      }
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteStep('email');
    setInviteLink('');
    setInviteLoading(false);
    setLinkCopied(false);
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    showToast('Sincronizacao iniciada.');
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const myVaults = vaults.filter(v => v.userId === user?.id);
  const pendingVaults = vaults.filter(v => v.status === 'pending' && v.userId !== user?.id);

  // --- Settings View ---
  if (showSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <button onClick={() => setShowSettings(false)} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            <span className="font-bold text-base">Configuracoes</span>
          </div>
          <div className="w-10"></div>
        </nav>
        <main className="p-4">
          <SettingsModal
            masterKey={masterKey}
            userPin={userPin}
            onLogout={onLogout}
            onPinChange={(newPin) => {
              setUserPin(newPin);
              localStorage.setItem('safe360_pin', newPin);
            }}
            currentPlan={(user?.plan?.toLowerCase() || 'free') as 'free' | 'pro' | 'scale'}
            isProcessing={false}
            onUpgrade={() => {
              const nextPlan = user?.plan === 'Free' ? 'Pro' : 'Scale';
              const amount = nextPlan === 'Pro' ? 500 : 1500;
              initiateRevolutPay(amount, 'EUR', async () => {
                try {
                  await fetch('/api/auth/upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ plan: nextPlan }),
                  });
                  showToast(`Plano atualizado para ${nextPlan}!`);
                  setTimeout(() => window.location.reload(), 1500);
                } catch {
                  showToast('Erro ao atualizar plano.', 'error');
                }
              }, () => showToast('Pagamento cancelado.', 'error'));
            }}
            transactions={[]}
            activityLogs={[]}
          />
        </main>
        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div key={toast.id} className={`px-4 py-2 rounded-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Vault Detail View ---
  if (selectedVault) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <button onClick={() => { setSelectedVault(null); setVaultItems([]); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <span className="font-bold text-base">{selectedVault.name}</span>
            {selectedVault.status === 'pending' && (
              <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-medium">Pendente</span>
            )}
          </div>
          <button
            onClick={() => setDeleteTarget(selectedVault)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Excluir cofre"
          >
            <Trash2 size={18} />
          </button>
        </nav>

        <main className="p-4 max-w-2xl mx-auto pb-24">
          {loadingItems ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {vaultItems.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FileText size={48} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Este cofre esta vazio</p>
                  <p className="text-sm mt-1">Adicione itens usando o botao abaixo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaultItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">{item.description}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* FAB to add item */}
        <button
          onClick={() => setShowAddItem(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110"
        >
          <Plus size={24} />
        </button>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddItem(false)}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Novo Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Titulo</label>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    placeholder="Ex: Senha do Banco"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Descricao / Notas</label>
                  <textarea
                    value={newItemDesc}
                    onChange={e => setNewItemDesc(e.target.value)}
                    placeholder="Detalhes, login, observacoes..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowAddItem(false); setNewItemTitle(''); setNewItemDesc(''); }} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300">Cancelar</button>
                <button onClick={handleAddItem} disabled={!newItemTitle.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Vault with PIN Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteTarget(null); setDeletePin(''); setDeleteError(''); }}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-3">
                  <Lock size={24} />
                </div>
                <h3 className="text-lg font-bold">Excluir Cofre?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Digite seu PIN para confirmar a exclusao permanente de <strong>{deleteTarget.name}</strong>.
                </p>
              </div>
              <input
                type="password"
                value={deletePin}
                onChange={e => { setDeletePin(e.target.value.replace(/\D/g, '').slice(0, 8)); setDeleteError(''); }}
                placeholder="PIN (4-8 digitos)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-red-500 outline-none"
                maxLength={8}
              />
              {deleteError && <p className="text-red-500 text-xs text-center mt-2">{deleteError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setDeleteTarget(null); setDeletePin(''); setDeleteError(''); }} className="flex-1 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 border border-slate-300 dark:border-slate-600">Cancelar</button>
                <button onClick={handleDeleteVault} disabled={deletePin.length < 4} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">Excluir</button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-4 left-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div key={toast.id} className={`px-4 py-2 rounded-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-600" size={24} />
          <span className="font-bold text-lg tracking-tight">Safe360</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
              {isSyncing ? 'Sincronizando...' : isOnline ? 'Online' : 'Offline'}
            </span>
            {isOnline && (
              <button onClick={handleSyncNow} className={`ml-1 text-slate-400 hover:text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} disabled={isSyncing}>
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          {user?.role === 'master' && onAdminConsole && (
            <button
              onClick={onAdminConsole}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Settings size={14} />
              Admin
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Configuracoes">
            <Settings size={20} />
          </button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-full px-4 mx-auto pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Ola, {user?.email}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {user?.role === 'master' ? 'Visao geral de todos os usuarios.' : user?.role === 'admin' ? 'Seu cofre esta seguro.' : 'Acesso restrito habilitado.'}
          </p>
        </div>

        {/* Pending approval section (for admin/owner) */}
        {pendingVaults.length > 0 && (user?.role === 'admin' || user?.role === 'master') && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 mb-3">
              <Clock size={16} />
              Cofres Pendentes de Aprovacao ({pendingVaults.length})
            </h2>
            <div className="space-y-2">
              {pendingVaults.map(vault => (
                <div key={vault.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{vault.name}</p>
                    <p className="text-xs text-slate-500">Criado por convidado</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveVault(vault.id)}
                      className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                      title="Aprovar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleRejectVault(vault.id)}
                      className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                      title="Rejeitar"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          {myVaults.map(vault => (
            <div
              key={vault.id}
              onClick={() => openVault(vault)}
              className="relative group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-500 transition-all"
            >
              {vault.status === 'pending' && (
                <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-medium">Pendente</span>
              )}
              <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <span className="font-semibold text-sm text-center">{vault.name}</span>
              <span className="text-[10px] text-slate-400">{(vault.data || []).length} itens</span>
            </div>
          ))}
          <div
            onClick={() => setShowAddVault(true)}
            className={`bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-slate-500 dark:text-slate-400 ${
              user?.role === 'guest' ? 'hover:border-yellow-500 hover:text-yellow-500' : 'hover:border-blue-500 hover:text-blue-500'
            }`}
          >
            <Plus size={24} />
            <span className="font-semibold text-sm">{user?.role === 'guest' ? 'Solicitar Cofre' : 'Novo Cofre'}</span>
          </div>
        </div>

        {/* Guest Users Section (admin/master only) */}
        {(user?.role === 'admin' || user?.role === 'master') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Usuarios Convidados</h2>
              <button
                onClick={() => { setShowInviteModal(true); setInviteStep('email'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <UserPlus size={14} />
                Adicionar Usuario Extra
              </button>
            </div>

            {guests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <UserPlus size={32} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium text-sm">Nenhum usuario convidado ainda.</p>
                <p className="text-xs mt-1">Adicione colaboradores para compartilhar acesso.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map(guest => (
                  <div key={guest.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{guest.email}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(guest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      guest.activated
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                    }`}>
                      {guest.activated ? 'Ativo' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invite Guest Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeInviteModal}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>

            {/* Step 1: Email */}
            {inviteStep === 'email' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 mb-3">
                    <UserPlus size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Adicionar Usuario Extra</h3>
                  <p className="text-xs text-slate-500 mt-1">Custo: EUR 2,00 por usuario</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">E-mail do Convidado</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={closeInviteModal} className="flex-1 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 border border-slate-300 dark:border-slate-600">Cancelar</button>
                  <button onClick={handleInviteGuest} disabled={!inviteEmail.trim()} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">Convidar</button>
                </div>
              </>
            )}

            {/* Step 2: Payment */}
            {inviteStep === 'payment' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-3">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Confirmar Pagamento</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Beneficiario</span>
                    <span className="font-medium">Ecom360.co</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Produto</span>
                    <span className="font-medium">Usuario Adicional</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Convidado</span>
                    <span className="font-medium">{inviteEmail}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between text-sm">
                    <span className="text-slate-500 font-semibold">Total</span>
                    <span className="font-bold text-lg">EUR 2,00</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setInviteStep('email'); setInviteLoading(false); }} className="flex-1 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 border border-slate-300 dark:border-slate-600">Cancelar</button>
                  <button onClick={handlePaymentConfirm} disabled={inviteLoading} className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {inviteLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Pagar Agora'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {inviteStep === 'success' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold">Convite Enviado!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Um email foi enviado para <strong>{inviteEmail}</strong> com o link de convite.
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Link de convite:</p>
                  <p className="text-xs font-mono text-blue-500 break-all">{inviteLink}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {linkCopied ? <><CheckCircle size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Link</>}
                  </button>
                  <button onClick={closeInviteModal} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 border border-slate-300 dark:border-slate-600">Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      {showAddVault && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAddVault(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {user?.role === 'guest' ? 'Solicitar Novo Cofre' : 'Criar Novo Cofre'}
            </h3>
            {user?.role === 'guest' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">
                Seu cofre ficara pendente ate o owner aprovar.
              </p>
            )}
            <input
              type="text"
              value={newVaultName}
              onChange={e => setNewVaultName(e.target.value)}
              placeholder="Nome do Cofre"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddVault(false)} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300">Cancelar</button>
              <button onClick={handleCreateVault} disabled={!newVaultName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                {user?.role === 'guest' ? 'Solicitar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-2 rounded-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
