import { ShieldCheck, LogOut, Plus, X, Landmark, Share2, HelpCircle, Send, Trash2, MessageSquare, Delete, RefreshCw, ArrowLeft, CloudUpload, Settings, UserPlus, CreditCard, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface DashboardProps {
  onLogout: () => void;
  userPin: string;
  masterKey: string;
  initialRecoveryLog?: boolean;
  lang: Language;
  setLang: (lang: Language) => void;
}

// Modais extraídos para otimização e redução de carga no componente principal
interface SavedItem {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  timestamp: Date;
  syncStatus: 'synced' | 'pending';
}

interface Category {
  id: string;
  name: string;
  icon: 'bank' | 'social' | 'custom';
  isFixed: boolean;
  color: string;
}

const ModalGravacao = ({ onClose, onSave, onFileAttach }: { onClose: () => void, onSave: (title: string, description: string) => void, onFileAttach: () => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Nova Gravação</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Senha do Banco" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Descrição (Opcional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Informações adicionais..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" />
            </div>
            <div onClick={onFileAttach} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <CloudUpload size={24} />
              <span className="text-sm font-medium">Anexar PDF, PNG ou JPG</span>
            </div>
            <button onClick={() => { onSave(title, description); }} disabled={!title.trim()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalSuporte = ({ onClose, message, setMessage, onSend }: { onClose: () => void, message: string, setMessage: (v: string) => void, onSend: () => void }) => {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Centro de Ajuda Safe360</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          <div className="space-y-4 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dúvidas Frequentes</p>
            {[
              { q: 'Esqueci meu PIN: Como recuperar?', a: 'Use sua Master Key na tela de login.' },
              { q: 'Onde fica minha Master Key?', a: 'Ela foi gerada no cadastro; você pode visualizá-la em Configurações > Segurança.' },
              { q: 'Como aumentar meu espaço?', a: 'Faça o upgrade para o plano SCALE para ter 2GB.' }
            ].map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-sm mb-1">{item.q}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.a}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fale Conosco</p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sua mensagem..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" />
            <button onClick={onSend} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all">
              <Send size={18} /> Enviar para Suporte Ecom360
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <button className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 hover:underline">
              <MessageSquare size={18} /> Falar com consultor via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalExtraUser = ({ onClose, categories }: { onClose: () => void, categories: Category[] }) => {
  const [step, setStep] = useState<'start' | 'checkout' | 'confirmed' | 'success'>('start');
  const [inviteLink, setInviteLink] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handlePermissionChange = (categoryId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === categories.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(categories.map(c => c.id));
    }
  };

  const isInviteReady = email.trim() !== '' && selectedPermissions.length > 0;

  const handlePurchase = () => {
    setStep('checkout');
    setTimeout(() => {
      setStep('confirmed');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Gerenciar Acessos</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          
          {step === 'start' && (
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-6">Adicione um novo membro à sua conta para compartilhar o acesso de forma segura.</p>
              <button onClick={handlePurchase} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                <UserPlus size={20} /> Comprar Slot Extra (€ 2,00)
              </button>
            </div>
          )}

          {step === 'checkout' && (
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Checkout Revolut</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Simulando processamento seguro...</p>
              <div className="animate-pulse flex flex-col items-center">
                <CreditCard size={40} className="text-blue-500 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </div>
            </div>
          )}

          {step === 'confirmed' && (
            <div>
              <h3 className="text-lg font-bold mb-3">Permissões de Acesso</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Selecione os cofres que este usuário poderá acessar.</p>
              
              <div className="space-y-2 text-left mb-4 max-h-40 overflow-y-auto p-1">
                <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input 
                    type="checkbox"
                    id="select-all"
                    checked={selectedPermissions.length === categories.length}
                    onChange={handleSelectAll}
                    className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"
                  />
                  <label htmlFor="select-all" className="ml-3 text-sm font-medium">Selecionar Todos</label>
                </div>
                {categories.map(category => (
                  <div key={category.id} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      id={`cat-${category.id}`}
                      checked={selectedPermissions.includes(category.id)}
                      onChange={() => handlePermissionChange(category.id)}
                      className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"
                    />
                    <label htmlFor={`cat-${category.id}`} className="ml-3 text-sm font-medium">{category.name}</label>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 mt-6">E-mail do convidado:</p>
              <div className="flex gap-2">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="flex-grow w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button onClick={() => { 
                  const uniqueId = Math.random().toString(36).substring(2, 8);
                  setInviteLink(`safe360.co/invite/${uniqueId}`);
                  setStep('success'); 
                }} disabled={!isInviteReady} className="py-3 px-5 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50 transition-opacity">Convidar</button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2 text-emerald-500">✅ Usuário criado com sucesso!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Envie o link abaixo para o convidado.</p>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mb-4">
                <p className="text-sm font-mono text-blue-500">{inviteLink}</p>
              </div>

              <button 
                onClick={() => navigator.clipboard.writeText(inviteLink).then(() => alert('Link copiado!'))} 
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold mb-4 hover:bg-emerald-700 transition-all">
                Copiar Link para enviar no WhatsApp
              </button>

              <div className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mb-6">
                <p className="font-bold mb-1">Instruções para o Convidado:</p>
                <p>O convidado precisará definir o próprio PIN de acesso aos cofres permitidos: <span className="font-semibold">{categories.filter(c => selectedPermissions.includes(c.id)).map(c => c.name).join(', ')}</span>.</p>
              </div>

              <button onClick={onClose} className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold hover:opacity-90 transition-all">Fechar</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ onBack }: { onBack: () => void }) => (
  <main className="p-4 max-w-lg mx-auto pb-24">
    <div className="flex items-center mb-8">
      <button onClick={onBack} className="p-2 mr-2 text-slate-500 hover:text-blue-600"><ArrowLeft size={20} /></button>
      <h1 className="text-2xl font-bold">Configurações</h1>
    </div>
    {/* O ExtraUserManager virá aqui */}
  </main>
);

const CategoryView = ({ category, items, onBack, onDeleteItem }: { category: Category, items: SavedItem[], onBack: () => void, onDeleteItem: (id: string) => void }) => (
  <main className="p-4 max-w-lg mx-auto pb-24">
    <div className="flex items-center mb-8">
      <button onClick={onBack} className="p-2 mr-2 text-slate-500 hover:text-blue-600"><ArrowLeft size={20} /></button>
      <div className={`w-10 h-10 rounded-full ${category.color} text-white flex items-center justify-center mr-3`}>
        {category.icon === 'bank' && <Landmark size={20} />}
        {category.icon === 'social' && <Share2 size={20} />}
        {category.icon === 'custom' && <ShieldCheck size={20} />}
      </div>
      <h1 className="text-2xl font-bold">{category.name}</h1>
    </div>

    {items.length === 0 ? (
      <div className="text-center py-16 text-slate-500">
        <p className="mb-2">Este cofre está vazio.</p>
        <p className="text-sm">Use o botão '+' para adicionar novas gravações.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
            <div>
              <p className="font-bold">{item.title}</p>
              {item.description && <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>}
              <p className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
            <button onClick={() => onDeleteItem(item.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    )}
  </main>
);

export function Dashboard({ onLogout, userPin }: DashboardProps) {
  const [showSupport, setShowSupport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Bancos', icon: 'bank', isFixed: true, color: 'bg-blue-500' },
    { id: '2', name: 'Social', icon: 'social', isFixed: true, color: 'bg-purple-500' },
  ]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [items, setItems] = useState<SavedItem[]>([]);
  const [deleteType, setDeleteType] = useState<'item' | 'category' | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtraUserModal, setShowExtraUserModal] = useState(false);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleReset = () => { localStorage.clear(); window.location.reload(); };
  const handleSendSupport = () => { alert('Mensagem enviada!'); setShowSupport(false); setMessage(''); };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([
        ...categories,
        {
          id: Date.now().toString(),
          name: newCategoryName,
          icon: 'custom',
          isFixed: false,
          color: 'bg-emerald-500',
        },
      ]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleDeleteRequest = (id: string, type: 'item' | 'category') => {
    setDeleteType(type);
    setIdToDelete(id);
    setShowDeleteConfirmModal(true);
    setDeletePin('');
    setDeleteError('');
  };

  const handleConfirmDelete = () => {
    if (deletePin === userPin) {
      if (deleteType === 'item' && idToDelete) {
        setItems(prev => prev.filter(i => i.id !== idToDelete));
      } else if (deleteType === 'category' && idToDelete) {
        setCategories(prev => prev.filter(c => c.id !== idToDelete));
        setItems(prev => prev.filter(i => i.categoryId !== idToDelete));
      }
      setShowDeleteConfirmModal(false);
    } else {
      setDeleteError('PIN incorreto!');
    }
  };

  const handleAddItem = (title: string, description: string) => {
    if (selectedCategory) {
      const newItem: SavedItem = {
        id: Date.now().toString(),
        title,
        description,
        categoryId: selectedCategory.id,
        timestamp: new Date(),
        syncStatus: 'pending',
      };
      setItems(prev => [...prev, newItem]);
      setShowAddModal(false);
      showToast('Gravação salva!');
    }
  };

  const handleFileAttach = () => {
    setSecurityLogs(prev => [`${new Date().toLocaleTimeString()} - 📁 Arquivo pronto para sincronia`, ...prev]);
    showToast('Anexo detectado!');
  };

  // Sync logic when coming online
  useEffect(() => {
    if (isOnline) {
      const pendingItems = items.filter(i => i.syncStatus === 'pending');
      if (pendingItems.length > 0) {
        setIsSyncing(true);
        setTimeout(() => {
          setItems(prev => prev.map(item => 
            item.syncStatus === 'pending' ? { ...item, syncStatus: 'synced' } : item
          ));
          setIsSyncing(false);
          showToast('Sincronização concluída.');
        }, 2000);
      }
    }
  }, [isOnline, items]);

  // Periodic Sync Simulation (every 30 seconds)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
      }, 1500);
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const handleSyncNow = () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setItems(prev => prev.map(item => 
        item.syncStatus === 'pending' ? { ...item, syncStatus: 'synced' } : item
      ));
      setIsSyncing(false);
      showToast('Sincronização concluída.');
    }, 2000);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-blue-600" size={24} />
          <span className="font-bold text-lg tracking-tight">Safe360</span>
        </div>
        <div className="flex items-center gap-4">
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
          <button onClick={() => setShowExtraUserModal(true)} className="flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors">
            <Plus size={16} />
            <User size={16} />
          </button>
          <button onClick={() => setShowSupport(true)} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
            <HelpCircle size={18} /> <span className="hidden sm:inline">Ajuda</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
            <Settings size={20} />
          </button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {showSettings ? (
        <SettingsView onBack={() => setShowSettings(false)} />
      ) : selectedCategory ? (
        <CategoryView 
          category={selectedCategory} 
          items={items.filter(i => i.categoryId === selectedCategory.id)}
          onBack={() => setSelectedCategory(null)}
          onDeleteItem={(id) => handleDeleteRequest(id, 'item')}
        />
      ) : (
        <main className="p-4 max-w-lg mx-auto pb-24">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Olá, Usuário</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Seu cofre está seguro.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {categories.map(category => (
              <div key={category.id} onClick={() => setSelectedCategory(category)} className="relative group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-500 transition-all">
                <div className={`w-12 h-12 rounded-full ${category.color} text-white flex items-center justify-center`}>
                  {category.icon === 'bank' && <Landmark size={24} />}
                  {category.icon === 'social' && <Share2 size={24} />}
                  {category.icon === 'custom' && <ShieldCheck size={24} />}
                </div>
                <span className="font-semibold">{category.name}</span>
                {!category.isFixed && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(category.id, 'category'); }} className="absolute top-2 right-2 w-6 h-6 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div 
              onClick={() => setShowAddCategory(true)}
              className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-all text-slate-500 dark:text-slate-400">
              <Plus size={24} />
              <span className="font-semibold text-sm">Novo Cofre</span>
            </div>
          </div>

          {securityLogs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Logs de Segurança</h3>
              <div className="space-y-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl max-h-32 overflow-y-auto">
                {securityLogs.map((log, i) => (
                  <p key={i} className="text-slate-500 dark:text-slate-400">{log}</p>
                ))}
              </div>
            </div>
          )}


        </main>
      )}

      <button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <Plus size={32} />
      </button>

      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Criar Novo Cofre</h3>
              <input 
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome do Cofre (Ex: Trabalho)"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowAddCategory(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold">Cancelar</button>
                <button onClick={handleAddCategory} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <ModalGravacao onClose={() => setShowAddModal(false)} onSave={handleAddItem} onFileAttach={handleFileAttach} />}
      {showSupport && <ModalSuporte onClose={() => setShowSupport(false)} message={message} setMessage={setMessage} onSend={handleSendSupport} />}
      {showExtraUserModal && <ModalExtraUser onClose={() => setShowExtraUserModal(false)} categories={categories} />}

      {/* Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-slate-900 text-white py-2 px-4 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom">
            {toast.message}
          </div>
        ))}
      </div>

      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu PIN para deletar permanentemente.</p>
              <div className="flex justify-center gap-3 my-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full ${i < deletePin.length ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
              {deleteError && <p className="text-red-500 text-xs mb-4">{deleteError}</p>}
              <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0].map((n) => (
                  <button 
                    key={n}
                    onClick={() => {
                      if (n === 'del') {
                        setDeletePin(p => p.slice(0, -1));
                      } else if (deletePin.length < 4) {
                        setDeletePin(p => p + n);
                      }
                    }}
                    className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-lg flex items-center justify-center"
                  >
                    {n === 'del' ? <Delete size={20} /> : n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowDeleteConfirmModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold">Cancelar</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold">Deletar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

