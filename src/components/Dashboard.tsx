import {
  ShieldCheck, LogOut, Plus, RefreshCw, Settings, ArrowLeft, Trash2,
  Lock, Check, XCircle, Clock, UserPlus, Copy, CheckCircle, Eye, EyeOff,
  FolderPlus, Home,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { initiateRevolutPay } from '../services/revolut';
import { SettingsModal } from './SettingsModal';
import { FolderCard } from './FolderCard';
import { PasswordCard } from './PasswordCard';
import { translations } from '../translations';
import type { Folder, VaultItem } from '../server/database/db';

// ─── Local types ─────────────────────────────────────────────────────────────

interface DraftPasswordField {
  label: string;
  value: string;
  visible: boolean;
}

interface Vault {
  id: string;
  name: string;
  userId: string;
  color?: string;
  status?: 'active' | 'pending';
  data: VaultItem[];
}

interface DashboardProps {
  onLogout: () => void;
  onBackToHome?: () => void;
  onAdminConsole?: () => void;
  user: User | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Dashboard({ onLogout, onBackToHome, onAdminConsole, user }: DashboardProps) {
  const { token, lang } = useAuth();
  const t = translations[lang ?? 'en'];
  const tv = t.dashboard.vault;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [newVaultName, setNewVaultName] = useState('');
  const [showAddVault, setShowAddVault] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);

  // ── Folder navigation ──
  const [folderStack, setFolderStack] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  // ── Folder creation ──
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366f1');

  // ── Settings ──
  const [showSettings, setShowSettings] = useState(false);
  const [userPin, setUserPin] = useState(() => {
    const saved = localStorage.getItem('safe360_pin');
    if (saved) return saved;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('safe360_pin', pin);
    return pin;
  });
  const [masterKey] = useState(() => {
    const saved = localStorage.getItem('safe360_masterKey');
    if (saved) return saved;
    const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const key = `SAFE-${seg()}-${seg()}-${seg()}`;
    localStorage.setItem('safe360_masterKey', key);
    return key;
  });

  // ── Add item modal ──
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [draftFields, setDraftFields] = useState<DraftPasswordField[]>([
    { label: '', value: '', visible: false },
  ]);

  // ── Delete vault modal ──
  const [deleteTarget, setDeleteTarget] = useState<Vault | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // ── Toasts ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  // ── Guest invite ──
  const [guests, setGuests] = useState<Array<{ id: string; email: string; activated: boolean; createdAt: string }>>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStep, setInviteStep] = useState<'email' | 'payment' | 'success'>('email');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const currentFolderId = folderStack.at(-1)?.id ?? null;

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchVaults = async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/vaults', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVaults(await res.json());
    } catch { /* silent */ }
  };

  const fetchGuests = async () => {
    if (!token || user?.role === 'guest') return;
    try {
      const res = await fetch('/api/auth/guests', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGuests(await res.json());
    } catch { /* silent */ }
  };

  const fetchFolderContents = useCallback(async (vaultId: string, parentId: string | null) => {
    if (!token) return;
    setLoadingContents(true);
    try {
      const parentQ = parentId ? `parentId=${parentId}` : 'parentId=root';
      const folderQ = parentId ? `folderId=${parentId}` : '';

      const [fRes, iRes] = await Promise.all([
        fetch(`/api/vaults/${vaultId}/folders?${parentQ}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/vaults/${vaultId}/items${folderQ ? `?${folderQ}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setFolders(fRes.ok ? await fRes.json() : []);
      setVaultItems(iRes.ok ? await iRes.json() : []);
    } catch {
      setFolders([]);
      setVaultItems([]);
    } finally {
      setLoadingContents(false);
    }
  }, [token]);

  useEffect(() => { fetchVaults(); fetchGuests(); }, [user]);

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

  // ─── Vault actions ────────────────────────────────────────────────────────

  const openVault = async (vault: Vault) => {
    setSelectedVault(vault);
    setFolderStack([]);
    await fetchFolderContents(vault.id, null);
  };

  const handleCreateVault = async () => {
    if (!token || !newVaultName.trim()) return;
    try {
      const res = await fetch('/api/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newVaultName }),
      });
      if (res.ok) {
        await fetchVaults();
        setNewVaultName('');
        setShowAddVault(false);
        showToast(user?.role === 'guest' ? 'Cofre criado! Aguardando aprovacao.' : 'Cofre criado!');
      } else {
        const err = await res.json();
        showToast(`Erro: ${err.message}`, 'error');
      }
    } catch { showToast('Falha ao criar cofre.', 'error'); }
  };

  const handleDeleteVault = async () => {
    if (!deleteTarget || !token || deletePin.length < 4) return;
    try {
      const res = await fetch(`/api/vaults/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: deletePin }),
      });
      if (res.ok) {
        setVaults(prev => prev.filter(v => v.id !== deleteTarget.id));
        if (selectedVault?.id === deleteTarget.id) {
          setSelectedVault(null); setVaultItems([]); setFolders([]); setFolderStack([]);
        }
        setDeleteTarget(null); setDeletePin(''); setDeleteError('');
        showToast('Cofre excluido.');
      } else { setDeleteError('PIN invalido ou erro ao excluir.'); }
    } catch { setDeleteError('Falha na exclusao.'); }
  };

  const handleApproveVault = async (vaultId: string) => {
    if (!token) return;
    const res = await fetch(`/api/vaults/${vaultId}/approve`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { await fetchVaults(); showToast('Cofre aprovado!'); }
  };

  const handleRejectVault = async (vaultId: string) => {
    if (!token) return;
    const res = await fetch(`/api/vaults/${vaultId}/reject`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { await fetchVaults(); showToast('Cofre rejeitado.'); }
  };

  // ─── Folder actions ───────────────────────────────────────────────────────

  const openFolder = async (folder: Folder) => {
    const newStack = [...folderStack, folder];
    setFolderStack(newStack);
    await fetchFolderContents(selectedVault!.id, folder.id);
  };

  const goBackFolder = async () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    await fetchFolderContents(selectedVault!.id, newStack.at(-1)?.id ?? null);
  };

  const handleCreateFolder = async () => {
    if (!selectedVault || !token || !newFolderName.trim()) return;
    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId, color: newFolderColor }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders(prev => [...prev, folder]);
        setNewFolderName(''); setNewFolderColor('#6366f1'); setShowAddFolder(false);
        showToast('Pasta criada!');
      } else {
        const err = await res.json();
        showToast(err.message === 'MAX_DEPTH_EXCEEDED' ? tv.maxDepth : `Erro: ${err.message}`, 'error');
      }
    } catch { showToast('Falha ao criar pasta.', 'error'); }
  };

  const handleFolderColorChange = async (folderId: string, color: string) => {
    if (!selectedVault || !token) return;
    // Optimistic update
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, color } : f));
    try {
      await fetch(`/api/vaults/${selectedVault.id}/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ color }),
      });
    } catch { /* silent */ }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!selectedVault || !token) return;
    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/folders/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== folderId));
        showToast('Pasta excluida. Itens movidos para a raiz.');
      }
    } catch { showToast('Erro ao excluir pasta.', 'error'); }
  };

  // ─── Item actions ─────────────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!selectedVault || !token || !newItemTitle.trim()) return;
    // Strip 'visible' before sending — never store UI state
    const passwords = draftFields
      .filter(f => f.label.trim() || f.value.trim())
      .map(({ label, value }) => ({ label, value }));

    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newItemTitle,
          description: passwords[0]?.value ?? '',
          passwords,
          folderId: currentFolderId,
          type: passwords.length > 0 ? 'password' : 'note',
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setVaultItems(prev => [...prev, item]);
        setNewItemTitle('');
        setDraftFields([{ label: '', value: '', visible: false }]);
        setShowAddItem(false);
        showToast(t.dashboard.toasts.saved);
      } else { showToast('Erro ao salvar item.', 'error'); }
    } catch { showToast('Falha ao salvar.', 'error'); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedVault || !token) return;
    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setVaultItems(prev => prev.filter(i => i.id !== itemId));
    } catch { /* silent */ }
  };

  // ─── Draft fields helpers ─────────────────────────────────────────────────

  const addDraftField = () => setDraftFields(prev => [...prev, { label: '', value: '', visible: false }]);
  const removeDraftField = (i: number) => setDraftFields(prev => prev.filter((_, idx) => idx !== i));
  const updateDraftField = (i: number, patch: Partial<DraftPasswordField>) =>
    setDraftFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  // ─── Invite helpers ───────────────────────────────────────────────────────

  const handleInviteGuest = () => { if (!inviteEmail.trim()) return; setInviteStep('payment'); };

  const handlePaymentConfirm = () => {
    setInviteLoading(true);
    initiateRevolutPay(200, 'EUR', async () => {
      try {
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: inviteEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          setInviteLink(data.inviteLink); setInviteStep('success'); fetchGuests();
        } else {
          const err = await res.json();
          showToast(`Erro: ${err.message}`, 'error'); setInviteStep('email');
        }
      } catch { showToast('Erro ao criar convite.', 'error'); setInviteStep('email'); }
      finally { setInviteLoading(false); }
    }, () => { showToast('Pagamento cancelado.', 'error'); setInviteLoading(false); setInviteStep('email'); });
  };

  const closeInviteModal = () => {
    setShowInviteModal(false); setInviteEmail(''); setInviteStep('email');
    setInviteLink(''); setInviteLoading(false); setLinkCopied(false);
  };

  const myVaults = vaults.filter(v => v.userId === user?.id);
  const pendingVaults = vaults.filter(v => v.status === 'pending' && v.userId !== user?.id);

  // ═══════════════════════════════════════════════════════════════
  //  SETTINGS VIEW
  // ═══════════════════════════════════════════════════════════════

  if (showSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <button onClick={() => setShowSettings(false)} className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors">
            <ArrowLeft size={20} /><span className="text-sm font-medium">{t.common.back}</span>
          </button>
          <div className="flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            <span className="font-bold text-base">Configuracoes</span>
          </div>
          <div className="w-10" />
        </nav>
        <main className="p-4">
          <SettingsModal
            masterKey={masterKey} userPin={userPin} onLogout={onLogout}
            onPinChange={(p) => { setUserPin(p); localStorage.setItem('safe360_pin', p); }}
            currentPlan={(user?.plan?.toLowerCase() || 'free') as 'free' | 'pro' | 'scale'}
            isProcessing={false}
            onUpgrade={() => {
              const nextPlan = user?.plan === 'Free' ? 'Pro' : 'Scale';
              const amount = nextPlan === 'Pro' ? 500 : 1500;
              initiateRevolutPay(amount, 'EUR', async () => {
                try {
                  await fetch('/api/auth/upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ plan: nextPlan }),
                  });
                  showToast(`Plano atualizado para ${nextPlan}!`);
                  setTimeout(() => window.location.reload(), 1500);
                } catch { showToast('Erro ao atualizar plano.', 'error'); }
              }, () => showToast('Pagamento cancelado.', 'error'));
            }}
            transactions={[]} activityLogs={[]}
          />
        </main>
        <ToastList toasts={toasts} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  VAULT DETAIL VIEW (with folder navigation)
  // ═══════════════════════════════════════════════════════════════

  if (selectedVault) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Navbar with breadcrumb */}
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
          <button
            onClick={folderStack.length > 0 ? goBackFolder : () => { setSelectedVault(null); setFolders([]); setVaultItems([]); setFolderStack([]); }}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t.common.back}</span>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm font-semibold flex-1 min-w-0 mx-3 overflow-hidden">
            <ShieldCheck className="text-blue-600 flex-shrink-0" size={16} />
            <span className="text-slate-400 truncate flex-shrink-0 max-w-[80px]">{selectedVault.name}</span>
            {folderStack.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1 min-w-0">
                <span className="text-slate-300 flex-shrink-0">/</span>
                <span className={`truncate ${i === folderStack.length - 1 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  {f.name}
                </span>
              </span>
            ))}
          </div>

          <button onClick={() => setDeleteTarget(selectedVault)} className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
            <Trash2 size={18} />
          </button>
        </nav>

        <main className="p-4 max-w-2xl mx-auto pb-28">
          {loadingContents ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  {folders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={openFolder}
                      onColorChange={handleFolderColorChange}
                      onDelete={handleDeleteFolder}
                      tVault={{ folderColor: tv.folderColor, folderEmpty: tv.folderEmpty }}
                    />
                  ))}
                </div>
              )}

              {/* Items */}
              {vaultItems.length === 0 && folders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShieldCheck size={44} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">
                    {folderStack.length > 0 ? tv.folderEmpty : 'Este cofre esta vazio'}
                  </p>
                  <p className="text-xs mt-1 opacity-70">Use o botao + para adicionar itens ou pastas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vaultItems.map(item => (
                    <PasswordCard
                      key={item.id}
                      item={item}
                      onDelete={handleDeleteItem}
                      tVault={{
                        showPassword: tv.showPassword,
                        hidePassword: tv.hidePassword,
                        copyField: tv.copyField,
                        fieldCopied: tv.fieldCopied,
                        passwordsSection: tv.passwordsSection,
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* FAB group */}
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
          <button
            onClick={() => setShowAddFolder(true)}
            className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow flex items-center justify-center transition-transform hover:scale-110"
            title={tv.newFolder}
          >
            <FolderPlus size={18} />
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Add Folder Modal */}
        {showAddFolder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddFolder(false)}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FolderPlus size={18} className="text-blue-500" />{tv.newFolder}
              </h3>
              <div className="space-y-3">
                <input
                  type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Nome da pasta" autoFocus
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 flex-shrink-0">{tv.folderColor}</label>
                  <input type="color" value={newFolderColor} onChange={e => setNewFolderColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <div className="flex gap-1.5 flex-wrap">
                    {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'].map(c => (
                      <button key={c} onClick={() => setNewFolderColor(c)}
                        className="w-5 h-5 rounded-full transition-transform hover:scale-110 border-2"
                        style={{ backgroundColor: c, borderColor: newFolderColor === c ? '#fff' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowAddFolder(false); setNewFolderName(''); }} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 text-sm">{t.pricing.cancel}</button>
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">Criar</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal with dynamic password fields */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddItem(false)}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t.dashboard.addItem.title}</h3>

              {/* Title */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.addItem.labelTitle}</label>
                <input type="text" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)}
                  placeholder={t.dashboard.addItem.placeholderTitle} autoFocus
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Dynamic password fields */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-2 block">{tv.passwordsSection}</label>
                <div className="space-y-2">
                  {draftFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text" value={field.label} onChange={e => updateDraftField(i, { label: e.target.value })}
                        placeholder={tv.fieldLabel}
                        className="w-[100px] flex-shrink-0 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="flex-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                        <input
                          type={field.visible ? 'text' : 'password'}
                          value={field.value} onChange={e => updateDraftField(i, { value: e.target.value })}
                          placeholder={tv.fieldValue}
                          className="flex-1 text-xs font-mono bg-transparent outline-none"
                        />
                        <button onClick={() => updateDraftField(i, { visible: !field.visible })} className="text-slate-400 hover:text-blue-500 transition-colors flex-shrink-0">
                          {field.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                      {draftFields.length > 1 && (
                        <button onClick={() => removeDraftField(i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addDraftField} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium mt-2 transition-colors">
                  <Plus size={12} />{tv.addField}
                </button>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowAddItem(false); setNewItemTitle(''); setDraftFields([{ label: '', value: '', visible: false }]); }}
                  className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 text-sm"
                >{t.pricing.cancel}</button>
                <button onClick={handleAddItem} disabled={!newItemTitle.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                  {t.dashboard.addItem.submit}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Vault Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteTarget(null); setDeletePin(''); setDeleteError(''); }}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="inline-flex w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 items-center justify-center mb-3"><Lock size={24} /></div>
                <h3 className="text-lg font-bold">{t.dashboard.deleteConfirm.titleCategory}</h3>
                <p className="text-sm text-slate-500 mt-1">{t.dashboard.deleteConfirm.subtitle} <strong>{deleteTarget.name}</strong></p>
              </div>
              <input type="password" value={deletePin}
                onChange={e => { setDeletePin(e.target.value.replace(/\D/g, '').slice(0, 8)); setDeleteError(''); }}
                placeholder="PIN (4-8 digitos)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-red-500"
                maxLength={8}
              />
              {deleteError && <p className="text-red-500 text-xs text-center mt-2">{deleteError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setDeleteTarget(null); setDeletePin(''); setDeleteError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">{t.dashboard.deleteConfirm.cancel}</button>
                <button onClick={handleDeleteVault} disabled={deletePin.length < 4} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">{t.dashboard.deleteConfirm.confirm}</button>
              </div>
            </div>
          </div>
        )}

        <ToastList toasts={toasts} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAIN DASHBOARD (vault grid)
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        {/* Logo as home link — req.5b */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 hover:opacity-75 transition-opacity"
          title={t.nav.backToHome}
        >
          <ShieldCheck className="text-blue-600" size={24} />
          <span className="font-bold text-lg tracking-tight">Safe360</span>
          <Home size={14} className="text-slate-400 -ml-1" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
              {isSyncing ? t.dashboard.nav.syncing : isOnline ? t.dashboard.nav.online : t.dashboard.nav.offline}
            </span>
            {isOnline && (
              <button
                onClick={() => { setIsSyncing(true); showToast('Sincronizacao iniciada.'); setTimeout(() => setIsSyncing(false), 1500); }}
                className={`ml-1 text-slate-400 hover:text-blue-500 ${isSyncing ? 'animate-spin' : ''}`}
                disabled={isSyncing}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
          {user?.role === 'master' && onAdminConsole && (
            <button onClick={onAdminConsole} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              <Settings size={13} />Admin
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Settings size={20} /></button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="p-4 max-w-full mx-auto pb-24">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-0.5">Ola, {user?.email?.split('@')[0]}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {user?.role === 'master' ? 'Visao geral de todos os usuarios.' : user?.role === 'admin' ? 'Seu cofre esta seguro.' : 'Acesso restrito habilitado.'}
          </p>
        </div>

        {/* Pending approvals */}
        {pendingVaults.length > 0 && (user?.role === 'admin' || user?.role === 'master') && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 mb-3">
              <Clock size={15} />Cofres Pendentes ({pendingVaults.length})
            </h2>
            <div className="space-y-2">
              {pendingVaults.map(vault => (
                <div key={vault.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-center justify-between">
                  <div><p className="font-medium text-sm">{vault.name}</p><p className="text-xs text-slate-500">Criado por convidado</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveVault(vault.id)} className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white"><Check size={14} /></button>
                    <button onClick={() => handleRejectVault(vault.id)} className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white"><XCircle size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vault grid — reduced scale (req.2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {myVaults.map(vault => (
            <div
              key={vault.id}
              onClick={() => openVault(vault)}
              className="relative group bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-500 transition-all"
            >
              {vault.status === 'pending' && (
                <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-medium">Pendente</span>
              )}
              {/* Reduced vault icon size */}
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <span className="font-semibold text-xs text-center leading-tight">{vault.name}</span>
              <span className="text-[10px] text-slate-400">{(vault.data || []).length} itens</span>
            </div>
          ))}
          <div
            onClick={() => setShowAddVault(true)}
            className={`bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-slate-500 dark:text-slate-400 ${user?.role === 'guest' ? 'hover:border-yellow-500 hover:text-yellow-500' : 'hover:border-blue-500 hover:text-blue-500'}`}
          >
            <Plus size={20} />
            <span className="font-semibold text-xs">{user?.role === 'guest' ? 'Solicitar Cofre' : 'Novo Cofre'}</span>
          </div>
        </div>

        {/* Guest users */}
        {(user?.role === 'admin' || user?.role === 'master') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">{t.dashboard.access.guestsTitle}</h2>
              <button onClick={() => { setShowInviteModal(true); setInviteStep('email'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <UserPlus size={13} />{t.dashboard.access.addExtra}
              </button>
            </div>
            {guests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <UserPlus size={28} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium text-sm">{t.dashboard.access.noGuests}</p>
                <p className="text-xs mt-1">{t.dashboard.access.noGuestsSub}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guests.map(guest => (
                  <div key={guest.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
                    <div><p className="font-medium text-sm">{guest.email}</p><p className="text-xs text-slate-400">{new Date(guest.createdAt).toLocaleDateString()}</p></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${guest.activated ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'}`}>
                      {guest.activated ? t.dashboard.access.active : t.dashboard.access.pending}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Vault Modal */}
      {showAddVault && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAddVault(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{user?.role === 'guest' ? 'Solicitar Novo Cofre' : 'Criar Novo Cofre'}</h3>
            {user?.role === 'guest' && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">Seu cofre ficara pendente ate o owner aprovar.</p>}
            <input type="text" value={newVaultName} onChange={e => setNewVaultName(e.target.value)} placeholder="Nome do Cofre"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddVault(false)} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300">{t.pricing.cancel}</button>
              <button onClick={handleCreateVault} disabled={!newVaultName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                {user?.role === 'guest' ? 'Solicitar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeInviteModal}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {inviteStep === 'email' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 items-center justify-center mb-3"><UserPlus size={24} /></div>
                  <h3 className="text-lg font-bold">{t.dashboard.access.addExtra}</h3>
                  <p className="text-xs text-slate-500 mt-1">Custo: {t.dashboard.access.inviteAmount} por usuario</p>
                </div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.access.emailLabel}</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder={t.dashboard.access.emailPlaceholder}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={closeInviteModal} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">{t.pricing.cancel}</button>
                  <button onClick={handleInviteGuest} disabled={!inviteEmail.trim()} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">{t.dashboard.access.invite}</button>
                </div>
              </>
            )}
            {inviteStep === 'payment' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 items-center justify-center mb-3"><ShieldCheck size={24} /></div>
                  <h3 className="text-lg font-bold">{t.dashboard.access.confirmPayment}</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-2 mb-4 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{t.dashboard.payment.beneficiary}</span><span className="font-medium">Ecom360.co</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t.dashboard.payment.product}</span><span className="font-medium">{t.dashboard.payment.extraUser}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t.dashboard.access.emailLabel}</span><span className="font-medium truncate max-w-[140px]">{inviteEmail}</span></div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                    <span className="font-semibold text-slate-500">Total</span>
                    <span className="font-bold text-lg">{t.dashboard.access.inviteAmount}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setInviteStep('email'); setInviteLoading(false); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">{t.dashboard.payment.cancel}</button>
                  <button onClick={handlePaymentConfirm} disabled={inviteLoading} className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {inviteLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t.dashboard.payment.payNow}
                  </button>
                </div>
              </>
            )}
            {inviteStep === 'success' && (
              <>
                <div className="text-center mb-4">
                  <div className="inline-flex w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 items-center justify-center mb-3"><CheckCircle size={24} /></div>
                  <h3 className="text-lg font-bold">{t.dashboard.access.inviteSuccess}</h3>
                  <p className="text-xs text-slate-500 mt-1">Email enviado para <strong>{inviteEmail}</strong></p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Link de convite:</p>
                  <p className="text-xs font-mono text-blue-500 break-all">{inviteLink}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {linkCopied ? <><CheckCircle size={15} />{t.dashboard.access.linkCopied}</> : <><Copy size={15} />{t.dashboard.access.copyLink}</>}
                  </button>
                  <button onClick={closeInviteModal} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ToastList toasts={toasts} />
    </div>
  );
}

// ─── Toast list ───────────────────────────────────────────────────────────────
function ToastList({ toasts }: { toasts: { id: string; message: string; type: 'success' | 'error' }[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className={`px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
