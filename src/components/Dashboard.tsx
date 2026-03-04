import {
  ShieldCheck, LogOut, Plus, RefreshCw, Settings, ArrowLeft, Trash2,
  Lock, Check, XCircle, Clock, UserPlus, Copy, CheckCircle, Eye, EyeOff,
  FolderPlus, Home, Paperclip, Pencil,
} from 'lucide-react';
import { hashPin, PinStore } from '../utils/pinUtils';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import {
  prepareRevolutCheckout,
  openRevolutPopup,
  type RevolutCheckoutHandle,
  type RevolutError,
} from '../services/revolut';
import { SettingsModal } from './SettingsModal';
import { FolderCard, FOLDER_ICON_MAP, FOLDER_ICON_KEYS } from './FolderCard';
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

  // ── Folder editing ──
  const [editFolderTarget, setEditFolderTarget] = useState<import('../server/database/db').Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#6366f1');
  const [editFolderIcon, setEditFolderIcon] = useState('Folder');
  const [editFolderPinStep, setEditFolderPinStep] = useState<'pin' | 'form' | null>(null);
  const [editFolderPin, setEditFolderPin] = useState('');
  const [editFolderPinError, setEditFolderPinError] = useState('');

  // ── Delete folder PIN ──
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [deleteFolderPin, setDeleteFolderPin] = useState('');
  const [deleteFolderPinError, setDeleteFolderPinError] = useState('');

  // ── Settings ──
  const [showSettings, setShowSettings] = useState(false);

  // ── Create vault color ──
  const [newVaultColor, setNewVaultColor] = useState('#3b82f6');

  // ── Add item modal ──
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [draftItemType, setDraftItemType] = useState<'email' | 'credential' | 'note' | 'media'>('credential');
  const [draftFields, setDraftFields] = useState<DraftPasswordField[]>([
    { label: '', value: '', visible: false },
  ]);
  const [draftNote, setDraftNote] = useState('');
  const [draftAttachment, setDraftAttachment] = useState<{ name: string; size: number; mimeType: string; data: string } | null>(null);

  // ── Edit item modal ──
  const [editTarget, setEditTarget] = useState<VaultItem | null>(null);
  const [editPin, setEditPin] = useState('');
  const [editPinError, setEditPinError] = useState('');
  const [editStep, setEditStep] = useState<'pin' | 'form' | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDraftItemType, setEditDraftItemType] = useState<'email' | 'credential' | 'note' | 'media'>('credential');
  const [editDraftFields, setEditDraftFields] = useState<DraftPasswordField[]>([]);
  const [editDraftNote, setEditDraftNote] = useState('');
  const [editDraftAttachment, setEditDraftAttachment] = useState<{ name: string; size: number; mimeType: string; data: string } | null>(null);

  // ── Delete vault modal ──
  const [deleteTarget, setDeleteTarget] = useState<Vault | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // ── Delete item modal (PIN-gated) ──
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null);
  const [deleteItemPin, setDeleteItemPin] = useState('');
  const [deleteItemPinError, setDeleteItemPinError] = useState('');

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

  // Revolut pre-created handles (pre-init before user clicks Pay)
  const [inviteRevolutHandle, setInviteRevolutHandle] = useState<RevolutCheckoutHandle | null>(null);
  const [upgradeRevolutHandle, setUpgradeRevolutHandle] = useState<RevolutCheckoutHandle | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const currentFolderId = folderStack.at(-1)?.id ?? null;

  // ─── Data fetching ────────────────────────────────────────────────────────

  const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const res = await fetch(input, init);
    if ((res.status === 401 || res.status === 400)) {
      const body = await res.clone().json().catch(() => ({}));
      if (body?.message === 'Invalid token' || body?.message === 'Access denied, no token provided') {
        onLogout();
      }
    }
    return res;
  };

  const fetchVaults = async () => {
    if (!token || !user) return;
    try {
      const res = await authFetch('/api/vaults', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVaults(await res.json());
    } catch { /* silent */ }
  };

  const fetchGuests = async () => {
    if (!token || user?.role === 'guest') return;
    try {
      const res = await authFetch('/api/auth/guests', { headers: { Authorization: `Bearer ${token}` } });
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

  // Pre-create Revolut order for invite payment when the invite payment step is shown
  useEffect(() => {
    if (inviteStep !== 'payment' || !user) return;
    setInviteRevolutHandle(null);
    prepareRevolutCheckout(200, 'EUR', user.id, 'invite', 'Safe360 Guest Invite')
      .then(handle => setInviteRevolutHandle(handle))
      .catch((err: RevolutError) => showToast(err.rawMessage, 'error'));
  }, [inviteStep, user?.id]);

  // Pre-create Revolut order for plan upgrade when settings screen opens
  useEffect(() => {
    if (!showSettings || !user) return;
    setUpgradeRevolutHandle(null);
    const nextPlan = user.plan === 'Free' ? 'Pro' : 'Scale';
    const amount = nextPlan === 'Pro' ? 500 : 1500;
    prepareRevolutCheckout(amount, 'EUR', user.id, nextPlan)
      .then(handle => setUpgradeRevolutHandle(handle))
      .catch((err: RevolutError) => console.warn('[upgrade] Pre-create failed:', err.rawMessage));
  }, [showSettings, user?.plan]);

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
      const res = await authFetch('/api/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newVaultName, color: newVaultColor }),
      });
      if (res.ok) {
        await fetchVaults();
        setNewVaultName('');
        setNewVaultColor('#3b82f6');
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

  // Triggers PIN-gate modal (or skips gate if no PIN registered)
  const handleDeleteFolder = (folderId: string) => {
    setDeleteFolderTarget(folderId);
    setDeleteFolderPin('');
    setDeleteFolderPinError('');
  };

  const handleDeleteFolderConfirm = async () => {
    if (!selectedVault || !token || !deleteFolderTarget) return;
    const storedHash = user?.id ? PinStore.getPinHash(user.id) : null;
    if (storedHash) {
      if (deleteFolderPin.length < 4) return;
      const inputHash = await hashPin(user.id!, deleteFolderPin);
      if (inputHash !== storedHash) {
        setDeleteFolderPinError(t.dashboard.editItem.pinError);
        return;
      }
    }
    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/folders/${deleteFolderTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== deleteFolderTarget));
        setDeleteFolderTarget(null); setDeleteFolderPin(''); setDeleteFolderPinError('');
        showToast('Pasta excluída. Itens movidos para a raiz.');
      }
    } catch { showToast('Erro ao excluir pasta.', 'error'); }
  };

  const handleEditFolderStart = (folder: import('../server/database/db').Folder) => {
    setEditFolderTarget(folder);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color);
    setEditFolderIcon(folder.icon ?? 'Folder');
    setEditFolderPin('');
    setEditFolderPinError('');
    const storedHash = user?.id ? PinStore.getPinHash(user.id) : null;
    setEditFolderPinStep(storedHash ? 'pin' : 'form');
  };

  const handleEditFolderPinSubmit = async () => {
    if (!user?.id || editFolderPin.length < 4) return;
    const storedHash = PinStore.getPinHash(user.id);
    if (!storedHash) { setEditFolderPinStep('form'); return; }
    const inputHash = await hashPin(user.id, editFolderPin);
    if (inputHash !== storedHash) {
      setEditFolderPinError(t.dashboard.editItem.pinError);
      return;
    }
    setEditFolderPin('');
    setEditFolderPinError('');
    setEditFolderPinStep('form');
  };

  const handleEditFolderSubmit = async () => {
    if (!selectedVault || !token || !editFolderTarget || !editFolderName.trim()) return;
    // Optimistic update
    setFolders(prev => prev.map(f =>
      f.id === editFolderTarget.id
        ? { ...f, name: editFolderName.trim(), color: editFolderColor, icon: editFolderIcon }
        : f
    ));
    setEditFolderTarget(null);
    try {
      await fetch(`/api/vaults/${selectedVault.id}/folders/${editFolderTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editFolderName.trim(), color: editFolderColor, icon: editFolderIcon }),
      });
    } catch { /* silent — optimistic update stays */ }
  };

  // ─── Item actions ─────────────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!selectedVault || !token || !newItemTitle.trim()) return;

    let passwords: { label: string; value: string }[] | undefined;
    let itemType: 'password' | 'note' | 'media';
    let description = '';

    if (draftItemType === 'credential' || draftItemType === 'email') {
      // Strip 'visible' before sending — never store UI state
      passwords = draftFields
        .filter(f => f.label.trim() || f.value.trim())
        .map(({ label, value }) => ({ label, value }));
      itemType = 'password';
      description = passwords[0]?.value ?? '';
    } else if (draftItemType === 'note') {
      itemType = 'note';
      description = draftNote;
    } else {
      itemType = 'media';
      description = '';
    }

    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newItemTitle,
          description,
          passwords: passwords ?? [],
          folderId: currentFolderId,
          type: itemType,
          attachment: draftAttachment,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setVaultItems(prev => [...prev, item]);
        // Keep vaults grid item count in sync
        setVaults(prev => prev.map(v => v.id === selectedVault!.id
          ? { ...v, data: [...(v.data || []), item] }
          : v
        ));
        setNewItemTitle('');
        setDraftFields([{ label: '', value: '', visible: false }]);
        setDraftNote('');
        setDraftAttachment(null);
        setDraftItemType('credential');
        setShowAddItem(false);
        showToast(t.dashboard.toasts.saved);
      } else { showToast('Erro ao salvar item.', 'error'); }
    } catch { showToast('Falha ao salvar.', 'error'); }
  };

  const handleDeleteItem = (itemId: string) => {
    const storedHash = user?.id ? PinStore.getPinHash(user.id) : null;
    if (storedHash) {
      setDeleteItemTarget(itemId);
      setDeleteItemPin('');
      setDeleteItemPinError('');
    } else {
      void handleDeleteItemConfirm(itemId);
    }
  };

  const handleDeleteItemConfirm = async (itemId: string) => {
    if (!selectedVault || !token) return;
    // PIN verification if PIN is registered
    const storedHash = user?.id ? PinStore.getPinHash(user.id) : null;
    if (storedHash && deleteItemTarget) {
      const inputHash = await hashPin(user!.id, deleteItemPin);
      if (inputHash !== storedHash) {
        setDeleteItemPinError(t.dashboard.editItem.pinError);
        return;
      }
    }
    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVaultItems(prev => prev.filter(i => i.id !== itemId));
        // Keep vaults grid item count in sync
        setVaults(prev => prev.map(v => v.id === selectedVault.id
          ? { ...v, data: (v.data || []).filter(i => i.id !== itemId) }
          : v
        ));
        setDeleteItemTarget(null);
        setDeleteItemPin('');
      }
    } catch { /* silent */ }
  };

  // ─── Pending item approval (admin/master only) ────────────────────────────

  const handleApproveItem = async (vaultId: string, itemId: string) => {
    if (!token) return;
    const res = await fetch(`/api/vaults/${vaultId}/items/${itemId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setVaults(prev => prev.map(v => v.id === vaultId
        ? { ...v, data: v.data.map(i => i.id === itemId ? { ...i, status: 'active' as const } : i) }
        : v
      ));
      showToast(tv.approveItem);
    }
  };

  const handleRejectItem = async (vaultId: string, itemId: string) => {
    if (!token) return;
    const res = await fetch(`/api/vaults/${vaultId}/items/${itemId}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setVaults(prev => prev.map(v => v.id === vaultId
        ? { ...v, data: v.data.filter(i => i.id !== itemId) }
        : v
      ));
      showToast(tv.rejectItem);
    }
  };

  // ─── Draft fields helpers ─────────────────────────────────────────────────

  const addDraftField = () => setDraftFields(prev => [...prev, { label: '', value: '', visible: false }]);
  const removeDraftField = (i: number) => setDraftFields(prev => prev.filter((_, idx) => idx !== i));
  const updateDraftField = (i: number, patch: Partial<DraftPasswordField>) =>
    setDraftFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  const handleItemTypeChange = (type: 'email' | 'credential' | 'note' | 'media') => {
    setDraftItemType(type);
    if (type === 'email') {
      setDraftFields([
        { label: 'E-mail', value: '', visible: false },
        { label: 'Senha', value: '', visible: false },
      ]);
    } else if (type === 'credential') {
      setDraftFields([{ label: '', value: '', visible: false }]);
    } else {
      setDraftFields([]);
    }
    setDraftNote('');
    setDraftAttachment(null);
  };

  // ─── Invite helpers ───────────────────────────────────────────────────────

  const handleInviteGuest = async () => {
    if (!inviteEmail.trim()) return;

    // Super Admin (master) bypasses payment — invite directly
    if (user?.role === 'master') {
      setInviteLoading(true);
      try {
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: inviteEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          setInviteLink(data.inviteLink);
          setInviteStep('success');
          fetchGuests();
        } else {
          const err = await res.json();
          showToast(`Erro: ${err.message}`, 'error');
        }
      } catch {
        showToast('Erro ao criar convite.', 'error');
      } finally {
        setInviteLoading(false);
      }
      return;
    }

    setInviteStep('payment');
  };

  const handlePaymentConfirm = () => {
    if (!inviteRevolutHandle) return;
    setInviteLoading(true);

    // openRevolutPopup is synchronous here — direct user gesture → no popup block
    openRevolutPopup(
      inviteRevolutHandle,
      async () => {
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
      },
      (err: RevolutError) => {
        showToast(err.stage === 'cancel' ? 'Pagamento cancelado.' : err.rawMessage, 'error');
        setInviteLoading(false);
        setInviteStep('email');
      }
    );
  };

  const closeInviteModal = () => {
    setShowInviteModal(false); setInviteEmail(''); setInviteStep('email');
    setInviteLink(''); setInviteLoading(false); setLinkCopied(false);
    setInviteRevolutHandle(null);
  };

  // ─── Edit item helpers ────────────────────────────────────────────────────

  const closeEditModal = () => {
    setEditTarget(null); setEditPin(''); setEditPinError(''); setEditStep(null);
    setEditTitle(''); setEditDraftFields([]); setEditDraftNote(''); setEditDraftAttachment(null);
  };

  const prefillEditForm = (item: VaultItem) => {
    setEditTitle(item.title);
    if (item.type === 'note') {
      setEditDraftItemType('note');
      setEditDraftNote(item.description ?? '');
      setEditDraftFields([]);
      setEditDraftAttachment(null);
    } else if (item.type === 'media') {
      setEditDraftItemType('media');
      setEditDraftNote('');
      setEditDraftFields([]);
      setEditDraftAttachment(item.attachment ?? null);
    } else {
      // 'password' or undefined — detect email by first field label
      const isEmail = item.passwords?.[0]?.label === 'E-mail';
      setEditDraftItemType(isEmail ? 'email' : 'credential');
      setEditDraftNote('');
      setEditDraftFields(
        item.passwords && item.passwords.length > 0
          ? item.passwords.map(p => ({ ...p, visible: false }))
          : [{ label: '', value: '', visible: false }]
      );
      setEditDraftAttachment(item.attachment ?? null);
    }
  };

  const handleEditStart = (item: VaultItem) => {
    setEditTarget(item);
    setEditPin('');
    setEditPinError('');
    // Skip PIN gate if no PIN has been registered
    const storedHash = user?.id ? PinStore.getPinHash(user.id) : null;
    if (!storedHash) {
      prefillEditForm(item);
      setEditStep('form');
    } else {
      setEditStep('pin');
    }
  };

  const handleEditPinSubmit = async () => {
    if (!user?.id || !editTarget || editPin.length < 4) return;
    const storedHash = PinStore.getPinHash(user.id);
    if (!storedHash) {
      prefillEditForm(editTarget);
      setEditPin('');
      setEditStep('form');
      return;
    }
    const inputHash = await hashPin(user.id, editPin);
    if (inputHash !== storedHash) {
      setEditPinError(t.dashboard.editItem.pinError);
      return;
    }
    setEditPin('');
    setEditPinError('');
    prefillEditForm(editTarget);
    setEditStep('form');
  };

  const handleEditSubmit = async () => {
    if (!selectedVault || !token || !editTarget || !editTitle.trim()) return;

    let passwords: { label: string; value: string }[] | undefined;
    let itemType: 'password' | 'note' | 'media';
    let description = '';

    if (editDraftItemType === 'credential' || editDraftItemType === 'email') {
      passwords = editDraftFields
        .filter(f => f.label.trim() || f.value.trim())
        .map(({ label, value }) => ({ label, value }));
      itemType = 'password';
      description = passwords[0]?.value ?? '';
    } else if (editDraftItemType === 'note') {
      itemType = 'note';
      description = editDraftNote;
    } else {
      itemType = 'media';
      description = '';
    }

    try {
      const res = await fetch(`/api/vaults/${selectedVault.id}/items/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle,
          description,
          passwords: passwords ?? [],
          type: itemType,
          attachment: editDraftAttachment,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setVaultItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        // Keep vaults grid data in sync
        if (selectedVault) {
          setVaults(prev => prev.map(v => v.id === selectedVault.id
            ? { ...v, data: (v.data || []).map(i => i.id === updated.id ? updated : i) }
            : v
          ));
        }
        closeEditModal();
        showToast(t.dashboard.toasts.saved);
      } else {
        showToast('Erro ao editar item.', 'error');
      }
    } catch { showToast('Falha ao salvar.', 'error'); }
  };

  const addEditDraftField = () => setEditDraftFields(prev => [...prev, { label: '', value: '', visible: false }]);
  const removeEditDraftField = (i: number) => setEditDraftFields(prev => prev.filter((_, idx) => idx !== i));
  const updateEditDraftField = (i: number, patch: Partial<DraftPasswordField>) =>
    setEditDraftFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));

  // ─── Derived state ────────────────────────────────────────────────────────

  const myVaults = user?.role === 'guest'
    ? vaults  // backend already returns own + admin's active vaults
    : vaults.filter(v => v.userId === user?.id);
  const pendingVaults = vaults.filter(v => v.status === 'pending' && v.userId !== user?.id);

  // Pending items across all guest vaults — visible to admin/master for approval
  const pendingItems = (user?.role === 'admin' || user?.role === 'master')
    ? vaults
        .filter(v => v.userId !== user?.id)
        .flatMap(v => (v.data || [])
          .filter(i => i.status === 'pending')
          .map(i => ({ ...i, vaultId: v.id, vaultName: v.name }))
        )
    : [];


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
            userId={user?.id || ''}
            userRole={user?.role}
            onLogout={onLogout}
            currentPlan={(user?.plan?.toLowerCase() || 'free') as 'free' | 'pro' | 'scale'}
            isProcessing={false}
            onUpgrade={() => {
              if (!upgradeRevolutHandle) return;
              const nextPlan = user?.plan === 'Free' ? 'Pro' : 'Scale';

              // Direct call — synchronous inside click handler → no popup block
              openRevolutPopup(
                upgradeRevolutHandle,
                async () => {
                  try {
                    await fetch('/api/auth/upgrade', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ plan: nextPlan }),
                    });
                    showToast(`Plano atualizado para ${nextPlan}!`);
                    setTimeout(() => window.location.reload(), 1500);
                  } catch { showToast('Erro ao atualizar plano.', 'error'); }
                },
                (err: RevolutError) => showToast(
                  err.stage === 'cancel' ? 'Pagamento cancelado.' : err.rawMessage,
                  'error'
                )
              );
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
    const isSharedVault = selectedVault.userId !== user?.id;
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
            {isSharedVault && (
              <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 uppercase tracking-wide">
                {tv.shared}
              </span>
            )}
            {folderStack.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1 min-w-0">
                <span className="text-slate-300 flex-shrink-0">/</span>
                <span className={`truncate ${i === folderStack.length - 1 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  {f.name}
                </span>
              </span>
            ))}
          </div>

          {!isSharedVault && (
            <button onClick={() => setDeleteTarget(selectedVault)} className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
              <Trash2 size={18} />
            </button>
          )}
          {isSharedVault && <div className="w-9 flex-shrink-0" />}
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
                      onDelete={isSharedVault ? undefined : handleDeleteFolder}
                      onEdit={isSharedVault ? undefined : handleEditFolderStart}
                      tVault={{ folderColor: tv.folderColor, folderEmpty: tv.folderEmpty, folderEdit: tv.folderEdit }}
                    />
                  ))}
                </div>
              )}

              {/* Items */}
              {vaultItems.length === 0 && folders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShieldCheck size={44} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">
                    {folderStack.length > 0 ? tv.folderEmpty : tv.vaultEmpty}
                  </p>
                  <p className="text-xs mt-1 opacity-70">{tv.addHint}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vaultItems.map(item => {
                    const isPending = item.status === 'pending';
                    const guestLocked = user?.role === 'guest' && isPending;
                    return (
                    <PasswordCard
                      key={item.id}
                      item={item}
                      onDelete={isSharedVault || guestLocked ? undefined : handleDeleteItem}
                      onEdit={isSharedVault || guestLocked ? undefined : handleEditStart}
                      tVault={{
                        showPassword: tv.showPassword,
                        hidePassword: tv.hidePassword,
                        copyField: tv.copyField,
                        fieldCopied: tv.fieldCopied,
                        passwordsSection: tv.passwordsSection,
                        itemPending: tv.itemPending,
                      }}
                    />
                  );
                  })}
                </div>
              )}
            </>
          )}
        </main>

        {/* FAB group — hidden for shared (read-only) vaults */}
        {!isSharedVault && (
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
        )}

        {/* Delete Item PIN Modal */}
        {deleteItemTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteItemTarget(null); setDeleteItemPin(''); }}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-red-600">
                <Trash2 size={18} />{tv.deleteItemTitle}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{t.dashboard.editItem.pinLabel}</p>
              <input
                type="password"
                value={deleteItemPin}
                onChange={e => { setDeleteItemPin(e.target.value); setDeleteItemPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && deleteItemPin.length >= 4 && handleDeleteItemConfirm(deleteItemTarget)}
                placeholder={t.dashboard.editItem.pinPlaceholder}
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-red-500"
                maxLength={8}
              />
              {deleteItemPinError && <p className="text-red-500 text-xs text-center mt-2">{deleteItemPinError}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setDeleteItemTarget(null); setDeleteItemPin(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm">{t.pricing.cancel}</button>
                <button
                  onClick={() => handleDeleteItemConfirm(deleteItemTarget)}
                  disabled={deleteItemPin.length < 4}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  <Trash2 size={14} className="inline mr-1" />OK
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Add Item Modal with dynamic type selector */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowAddItem(false); setNewItemTitle(''); setDraftFields([{ label: '', value: '', visible: false }]); setDraftNote(''); setDraftAttachment(null); setDraftItemType('credential' as const); }}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t.dashboard.addItem.title}</h3>

              {/* Type selector */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-2 block">{t.dashboard.addItem.itemType}</label>
                <div className="flex gap-2 flex-wrap">
                  {(['email', 'credential', 'note', 'media'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleItemTypeChange(type)}
                      className={`flex-1 min-w-[70px] px-2 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                        draftItemType === type
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {type === 'email' ? t.dashboard.addItem.typeEmail
                        : type === 'credential' ? t.dashboard.addItem.typeCredential
                        : type === 'note' ? t.dashboard.addItem.typeNote
                        : t.dashboard.addItem.typeMedia}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.addItem.labelTitle}</label>
                <input type="text" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)}
                  placeholder={t.dashboard.addItem.placeholderTitle} autoFocus
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Credential / Email: label/value password fields */}
              {(draftItemType === 'credential' || draftItemType === 'email') && (
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
              )}

              {/* Note: textarea */}
              {draftItemType === 'note' && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.addItem.labelNote}</label>
                  <textarea
                    value={draftNote}
                    onChange={e => setDraftNote(e.target.value)}
                    placeholder={t.dashboard.addItem.placeholderNote}
                    rows={6}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {/* File attachment — available for credential, email and media types */}
              {(draftItemType === 'credential' || draftItemType === 'email' || draftItemType === 'media') && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">{t.dashboard.addItem.labelAttachment}</label>
                  {draftAttachment ? (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                      <Paperclip size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate">{draftAttachment.name}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{(draftAttachment.size / 1024).toFixed(0)}KB</span>
                      <button type="button" onClick={() => setDraftAttachment(null)} className="p-0.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 transition-colors">
                      <Paperclip size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">{t.dashboard.addItem.dropzone}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const base64 = (ev.target?.result as string).split(',')[1];
                            setDraftAttachment({ name: file.name, size: file.size, mimeType: file.type, data: base64 });
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowAddItem(false); setNewItemTitle(''); setDraftFields([{ label: '', value: '', visible: false }]); setDraftNote(''); setDraftAttachment(null); setDraftItemType('credential' as const); }}
                  className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 text-sm"
                >{t.pricing.cancel}</button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemTitle.trim() || (draftItemType === 'media' && !draftAttachment)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
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

        {/* Edit Item Modal — PIN gate → form */}
        {editStep && editTarget && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeEditModal}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

              {/* ── PIN gate step ── */}
              {editStep === 'pin' && (
                <>
                  <div className="text-center mb-4">
                    <div className="inline-flex w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 items-center justify-center mb-3">
                      <Pencil size={22} />
                    </div>
                    <h3 className="text-lg font-bold">{t.dashboard.editItem.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">{editTarget.title}</p>
                  </div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.editItem.pinLabel}</label>
                  <input
                    type="password"
                    value={editPin}
                    onChange={e => { setEditPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setEditPinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleEditPinSubmit()}
                    placeholder={t.dashboard.editItem.pinPlaceholder}
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={8}
                  />
                  {editPinError && <p className="text-red-500 text-xs text-center mt-2">{editPinError}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeEditModal} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm">{t.pricing.cancel}</button>
                    <button onClick={handleEditPinSubmit} disabled={editPin.length < 4} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">→</button>
                  </div>
                </>
              )}

              {/* ── Edit form step ── */}
              {editStep === 'form' && (
                <>
                  <h3 className="text-lg font-bold mb-4">{t.dashboard.editItem.title}</h3>

                  {/* Type selector */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-slate-500 mb-2 block">{t.dashboard.addItem.itemType}</label>
                    <div className="flex gap-2 flex-wrap">
                      {(['email', 'credential', 'note', 'media'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setEditDraftItemType(type);
                            if (type === 'email') {
                              setEditDraftFields([
                                { label: 'E-mail', value: '', visible: false },
                                { label: 'Senha', value: '', visible: false },
                              ]);
                            } else if (type === 'credential') {
                              if (editDraftFields.length === 0) setEditDraftFields([{ label: '', value: '', visible: false }]);
                            } else {
                              setEditDraftFields([]);
                            }
                          }}
                          className={`flex-1 min-w-[70px] px-2 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                            editDraftItemType === type
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {type === 'email' ? t.dashboard.addItem.typeEmail
                            : type === 'credential' ? t.dashboard.addItem.typeCredential
                            : type === 'note' ? t.dashboard.addItem.typeNote
                            : t.dashboard.addItem.typeMedia}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.addItem.labelTitle}</label>
                    <input
                      type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      placeholder={t.dashboard.addItem.placeholderTitle}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Credential / Email fields */}
                  {(editDraftItemType === 'credential' || editDraftItemType === 'email') && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-slate-500 mb-2 block">{tv.passwordsSection}</label>
                      <div className="space-y-2">
                        {editDraftFields.map((field, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text" value={field.label}
                              onChange={e => updateEditDraftField(i, { label: e.target.value })}
                              placeholder={tv.fieldLabel}
                              className="w-[100px] flex-shrink-0 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                              <input
                                type={field.visible ? 'text' : 'password'}
                                value={field.value}
                                onChange={e => updateEditDraftField(i, { value: e.target.value })}
                                placeholder={tv.fieldValue}
                                className="flex-1 text-xs font-mono bg-transparent outline-none"
                              />
                              <button onClick={() => updateEditDraftField(i, { visible: !field.visible })} className="text-slate-400 hover:text-blue-500 transition-colors flex-shrink-0">
                                {field.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                            {editDraftFields.length > 1 && (
                              <button onClick={() => removeEditDraftField(i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={addEditDraftField} className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 font-medium mt-2 transition-colors">
                        <Plus size={12} />{tv.addField}
                      </button>
                    </div>
                  )}

                  {/* Note */}
                  {editDraftItemType === 'note' && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.addItem.labelNote}</label>
                      <textarea
                        value={editDraftNote}
                        onChange={e => setEditDraftNote(e.target.value)}
                        placeholder={t.dashboard.addItem.placeholderNote}
                        rows={6}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  )}

                  {/* Attachment */}
                  {(editDraftItemType === 'credential' || editDraftItemType === 'email' || editDraftItemType === 'media') && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-slate-500 mb-2 block">{t.dashboard.addItem.labelAttachment}</label>
                      {editDraftAttachment ? (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
                          <Paperclip size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate">{editDraftAttachment.name}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{(editDraftAttachment.size / 1024).toFixed(0)}KB</span>
                          <button type="button" onClick={() => setEditDraftAttachment(null)} className="p-0.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 transition-colors">
                          <Paperclip size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500">{t.dashboard.addItem.dropzone}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => {
                                const base64 = (ev.target?.result as string).split(',')[1];
                                setEditDraftAttachment({ name: file.name, size: file.size, mimeType: file.type, data: base64 });
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={closeEditModal} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 text-sm">{t.pricing.cancel}</button>
                    <button
                      onClick={handleEditSubmit}
                      disabled={!editTitle.trim() || (editDraftItemType === 'media' && !editDraftAttachment)}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {t.dashboard.editItem.submit}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Edit Folder Modal ──────────────────────────────────────────── */}
        {editFolderTarget && editFolderPinStep && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditFolderTarget(null)}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>

              {/* ── PIN gate step ── */}
              {editFolderPinStep === 'pin' && (
                <>
                  <div className="text-center mb-4">
                    <div className="inline-flex w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 items-center justify-center mb-3">
                      <Pencil size={22} />
                    </div>
                    <h3 className="text-lg font-bold">{tv.folderEdit}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">{editFolderTarget.name}</p>
                  </div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">{t.dashboard.editItem.pinLabel}</label>
                  <input
                    type="password"
                    value={editFolderPin}
                    onChange={e => { setEditFolderPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setEditFolderPinError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleEditFolderPinSubmit()}
                    placeholder={t.dashboard.editItem.pinPlaceholder}
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={8}
                  />
                  {editFolderPinError && <p className="text-red-500 text-xs text-center mt-2">{editFolderPinError}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setEditFolderTarget(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 text-sm">{t.pricing.cancel}</button>
                    <button onClick={handleEditFolderPinSubmit} disabled={editFolderPin.length < 4} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">→</button>
                  </div>
                </>
              )}

              {/* ── Edit form step ── */}
              {editFolderPinStep === 'form' && <>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${editFolderColor}22` }}>
                  {(() => { const Ic = FOLDER_ICON_MAP[editFolderIcon] ?? FOLDER_ICON_MAP['Folder']; return <Ic size={18} style={{ color: editFolderColor }} />; })()}
                </div>
                <h2 className="text-base font-bold">{tv.folderEdit}</h2>
              </div>

              {/* Name */}
              <label className="block mb-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{tv.folderName}</span>
                <input
                  type="text"
                  value={editFolderName}
                  onChange={e => setEditFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditFolderSubmit()}
                  maxLength={48}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </label>

              {/* Color */}
              <div className="mb-4">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">{tv.folderColor}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'].map(c => (
                    <button
                      key={c}
                      onClick={() => setEditFolderColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${editFolderColor === c ? 'border-white ring-2 ring-offset-1 ring-blue-500 scale-110' : 'border-white'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform" title="Cor personalizada">
                    <span className="text-[9px] text-slate-400">+</span>
                    <input type="color" value={editFolderColor} onChange={e => setEditFolderColor(e.target.value)} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* Icon grid */}
              <div className="mb-5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">{tv.folderIcon}</span>
                <div className="grid grid-cols-8 gap-1.5">
                  {FOLDER_ICON_KEYS.map(iconKey => {
                    const Ic = FOLDER_ICON_MAP[iconKey];
                    const isSelected = editFolderIcon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        onClick={() => setEditFolderIcon(iconKey)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                          isSelected
                            ? 'ring-2 ring-blue-500 scale-110'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                        style={isSelected ? { backgroundColor: `${editFolderColor}33` } : {}}
                        title={iconKey}
                      >
                        <Ic size={14} style={{ color: isSelected ? editFolderColor : undefined }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditFolderTarget(null)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t.dashboard.items.cancel}
                </button>
                <button
                  onClick={handleEditFolderSubmit}
                  disabled={!editFolderName.trim()}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {t.dashboard.items.save}
                </button>
              </div>
              </>}
            </div>
          </div>
        )}

        {/* ── Delete Folder PIN Modal ────────────────────────────────────── */}
        {deleteFolderTarget && (() => {
          const hasPin = user?.id ? !!PinStore.getPinHash(user.id) : false;
          return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setDeleteFolderTarget(null); setDeleteFolderPin(''); setDeleteFolderPinError(''); }}>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <div className="inline-flex w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 items-center justify-center mb-3"><Lock size={24} /></div>
                  <h3 className="text-lg font-bold">{tv.folderDeleteTitle}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t.dashboard.deleteConfirm.subtitle}</p>
                </div>
                {hasPin && (
                  <>
                    <input
                      type="password"
                      value={deleteFolderPin}
                      onChange={e => { setDeleteFolderPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setDeleteFolderPinError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleDeleteFolderConfirm()}
                      placeholder="PIN (4-8 dígitos)"
                      autoFocus
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-red-500"
                      maxLength={8}
                    />
                    {deleteFolderPinError && <p className="text-red-500 text-xs text-center mt-2">{deleteFolderPinError}</p>}
                  </>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setDeleteFolderTarget(null); setDeleteFolderPin(''); setDeleteFolderPinError(''); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">{t.dashboard.deleteConfirm.cancel}</button>
                  <button onClick={handleDeleteFolderConfirm} disabled={hasPin && deleteFolderPin.length < 4} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">{t.dashboard.deleteConfirm.confirm}</button>
                </div>
              </div>
            </div>
          );
        })()}

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
          <h1 className="text-xl font-bold mb-0.5">{tv.greeting}, {user?.email?.split('@')[0]}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {user?.role === 'master' ? tv.masterSubtitle : user?.role === 'admin' ? tv.adminSubtitle : tv.guestSubtitle}
          </p>
        </div>

        {/* Pending approvals */}
        {pendingVaults.length > 0 && (user?.role === 'admin' || user?.role === 'master') && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2 mb-3">
              <Clock size={15} />{tv.pendingVaults} ({pendingVaults.length})
            </h2>
            <div className="space-y-2">
              {pendingVaults.map(vault => (
                <div key={vault.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-center justify-between">
                  <div><p className="font-medium text-sm">{vault.name}</p><p className="text-xs text-slate-500">{tv.createdByGuest}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveVault(vault.id)} className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white"><Check size={14} /></button>
                    <button onClick={() => handleRejectVault(vault.id)} className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white"><XCircle size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending items (from guest vaults) — admin/master approval */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-3">
              <Clock size={15} />{tv.pendingItems} ({pendingItems.length})
            </h2>
            <div className="space-y-2">
              {pendingItems.map(item => (
                <div key={`${item.vaultId}-${item.id}`} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.vaultName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveItem(item.vaultId, item.id)} title={tv.approveItem} className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"><Check size={14} /></button>
                    <button onClick={() => handleRejectItem(item.vaultId, item.id)} title={tv.rejectItem} className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"><XCircle size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vault grid — app-style cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {myVaults.map(vault => {
            const accentColor = vault.color || '#3b82f6';
            const itemCount = (vault.data || []).length;
            const isShared = vault.userId !== user?.id;
            return (
              <div
                key={vault.id}
                onClick={() => openVault(vault)}
                className="relative group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 select-none"
              >
                {/* Colored top accent bar */}
                <div className="w-full h-1 flex-shrink-0" style={{ backgroundColor: accentColor }} />

                {/* Content */}
                <div className="px-3 pt-4 pb-3 flex flex-col items-center gap-2 w-full">
                  {vault.status === 'pending' && (
                    <span className="absolute top-2 right-2 text-[9px] bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">!</span>
                  )}
                  {isShared && (
                    <span className="absolute top-2 left-2 text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none uppercase tracking-wide">{tv.shared}</span>
                  )}
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: accentColor }}>
                    <ShieldCheck size={20} />
                  </div>
                  {/* Name */}
                  <span className="font-bold text-xs text-center leading-snug line-clamp-2 w-full" style={{ color: 'inherit' }}>{vault.name}</span>
                  {/* Badge */}
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {itemCount} {tv.items}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            onClick={() => setShowAddVault(true)}
            className={`bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-slate-500 dark:text-slate-400 min-h-[120px] ${user?.role === 'guest' ? 'hover:border-yellow-500 hover:text-yellow-500' : 'hover:border-blue-500 hover:text-blue-500'}`}
          >
            <Plus size={20} />
            <span className="font-semibold text-xs">{user?.role === 'guest' ? tv.requestVault : tv.newVault}</span>
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
            <h3 className="text-lg font-bold mb-4">{user?.role === 'guest' ? tv.requestNewVault : tv.createNewVault}</h3>
            {user?.role === 'guest' && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">{t.dashboard.access.pending}</p>}
            <input type="text" value={newVaultName} onChange={e => setNewVaultName(e.target.value)} placeholder={tv.newVault}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Color picker */}
            <div className="flex items-center gap-3 mt-3">
              <label className="text-xs font-medium text-slate-500 flex-shrink-0">Cor</label>
              <input
                type="color" value={newVaultColor}
                onChange={e => setNewVaultColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0"
              />
              <div className="flex gap-1.5 flex-wrap">
                {['#3b82f6','#6366f1','#ec4899','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'].map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setNewVaultColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110 ring-offset-1"
                    style={{ backgroundColor: c, outline: newVaultColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddVault(false)} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300">{t.pricing.cancel}</button>
              <button onClick={handleCreateVault} disabled={!newVaultName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
                {user?.role === 'guest' ? tv.requestVault : tv.createNewVault}
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
                  {user?.role !== 'master' && (
                    <p className="text-xs text-slate-500 mt-1">Custo: {t.dashboard.access.inviteAmount} por usuario</p>
                  )}
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
