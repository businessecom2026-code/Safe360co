import { ShieldCheck, LogOut, Plus, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { User } from '../types';

interface DashboardProps {
  onLogout: () => void;
  user: User | null;
}

export function Dashboard({ onLogout, user }: DashboardProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [vaults, setVaults] = useState<any[]>([]);
  const [newVaultName, setNewVaultName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  useEffect(() => {
    const fetchVaults = async () => {
      const token = localStorage.getItem('token');
      if (!token || !user) return;

      try {
        const response = await fetch('/api/vaults', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setVaults(data);
        } else {
          console.error('Failed to fetch vaults:', await response.text());
          showToast('Falha ao carregar cofres.', 'error');
        }
      } catch (error) {
        console.error('Failed to fetch vaults', error);
        showToast('Falha ao carregar cofres.', 'error');
      }
    };

    fetchVaults();
  }, [user]);

  const handleCreateVault = async () => {
    const token = localStorage.getItem('token');
    if (!token || !newVaultName.trim()) return;

    try {
      const response = await fetch('/api/vaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newVaultName }),
      });

      if (response.ok) {
        const newVault = await response.json();
        setVaults([...vaults, newVault]);
        setNewVaultName('');
        setShowAddCategory(false);
        showToast('Cofre criado com sucesso!', 'success');
      } else {
        const errorData = await response.json();
        showToast(`Erro: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Failed to create vault', error);
      showToast('Falha ao criar o cofre.', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
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

  const handleSyncNow = () => {
      setIsSyncing(true);
      showToast('Sincronização iniciada.', 'success');
      setTimeout(() => setIsSyncing(false), 1500);
  }

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
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="p-4 max-w-full px-4 mx-auto pb-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Olá, {user?.email}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {user?.role === 'master' ? 'Visão geral de todos os usuários.' : user?.role === 'admin' ? 'Seu cofre está seguro.' : 'Acesso restrito habilitado.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {vaults.map(vault => (
            <div key={vault.id} className="relative group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-500 transition-all">
              <div className={`w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center`}>
                <ShieldCheck size={24} />
              </div>
              <span className="font-semibold">{vault.name}</span>
              {user?.role === 'master' && <span className="text-xs text-slate-400">ID do Usuário: {vault.userId}</span>}
            </div>
          ))}
          {user?.role !== 'guest' && (
            <div 
              onClick={() => setShowAddCategory(true)}
              className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-all text-slate-500 dark:text-slate-400">
              <Plus size={24} />
              <span className="font-semibold text-sm">Novo Cofre</span>
            </div>
          )}
        </div>
      </main>

      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowAddCategory(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Criar Novo Cofre</h3>
            <input 
              type="text"
              value={newVaultName}
              onChange={e => setNewVaultName(e.target.value)}
              placeholder="Nome do Cofre"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddCategory(false)} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300">Cancelar</button>
              <button onClick={handleCreateVault} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-2 rounded-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

