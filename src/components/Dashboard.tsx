import { ShieldCheck, LogOut, Plus, Wifi, WifiOff, X, Trash2, Landmark, Share2, FolderPlus, Save, Users, CreditCard, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface DashboardProps {
  onLogout: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: 'bank' | 'social' | 'custom';
  isFixed: boolean;
  color: string;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Bancos', icon: 'bank', isFixed: true, color: 'bg-blue-500' },
    { id: '2', name: 'Social', icon: 'social', isFixed: true, color: 'bg-purple-500' },
  ]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Guest Management State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [guests, setGuests] = useState<string[]>([]);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

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

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([
        ...categories,
        {
          id: Date.now().toString(),
          name: newCategoryName,
          icon: 'custom',
          isFixed: false,
          color: 'bg-emerald-500', // Default color for custom
        },
      ]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleAddGuest = () => {
    if (newGuestEmail.trim()) {
      setGuests([...guests, newGuestEmail]);
      setNewGuestEmail('');
      setShowEmailInput(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsPaymentProcessing(true);
    setTimeout(() => {
      setIsPaymentProcessing(false);
      setShowPaymentModal(false);
      setShowEmailInput(true);
    }, 1500);
  };

  const getIcon = (type: string, size = 32) => {
    switch (type) {
      case 'bank': return <Landmark size={size} className="text-white" />;
      case 'social': return <Share2 size={size} className="text-white" />;
      default: return <FolderPlus size={size} className="text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 relative pb-24">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xl text-gray-900 dark:text-white hidden sm:inline">Safe360</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isOnline 
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            <button
              onClick={() => setShowAccessModal(true)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              title="Gerenciar Acessos"
            >
              <Users size={20} />
            </button>

            <ThemeToggle />
            
            <button 
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Minhas Categorias</h1>
        
        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((category) => (
            <div 
              key={category.id}
              className="group relative aspect-square bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center p-4 transition-all cursor-pointer active:scale-95"
            >
              <div className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mb-3 shadow-lg shadow-blue-900/5`}>
                {getIcon(category.icon)}
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-center">{category.name}</span>
              
              {!category.isFixed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {/* Add Category Button/Card */}
          <button
            onClick={() => setShowAddCategory(true)}
            className="aspect-square bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 flex flex-col items-center justify-center p-4 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all active:scale-95"
          >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform duration-300 ${showFabMenu ? 'rotate-45 bg-red-500 hover:bg-red-600' : 'hover:bg-blue-700 hover:scale-110'}`}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* FAB Menu Overlay */}
      {showFabMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">O que deseja salvar?</h3>
              <button onClick={() => setShowFabMenu(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    alert(`Salvando em ${category.name} (Simulação)`);
                    setShowFabMenu(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center text-white`}>
                    {getIcon(category.icon, 18)}
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Close on click outside */}
          <div className="absolute inset-0 -z-10" onClick={() => setShowFabMenu(false)} />
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nova Categoria</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome da categoria (ex: Viagens)"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddCategory(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Management Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gerenciar Acessos</h3>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Usuários Convidados</h4>
              {guests.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum usuário convidado ainda.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {guests.map((email, index) => (
                    <li key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <span className="text-gray-900 dark:text-white text-sm">{email}</span>
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">Ativo</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!showEmailInput ? (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus size={18} />
                Adicionar Usuário Extra (€ 2,00)
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">E-mail do Convidado</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddGuest}
                    disabled={!newGuestEmail.trim()}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Convidar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulated Revolut Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-[#191919] text-white p-6 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl mb-1">Revolut</h3>
                <p className="text-white/60 text-sm">Pagamento Seguro</p>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <CreditCard size={24} />
              </div>
            </div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-gray-500 text-sm mb-2">Valor a pagar</p>
                <h2 className="text-4xl font-bold text-gray-900">€ 2,00</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">Beneficiário</span>
                  <span className="font-medium text-gray-900">Safe360 Ltd.</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">Produto</span>
                  <span className="font-medium text-gray-900">Usuário Adicional</span>
                </div>
              </div>

              <button
                onClick={handlePaymentSuccess}
                disabled={isPaymentProcessing}
                className="w-full py-4 rounded-xl bg-[#0075EB] text-white font-bold text-lg hover:bg-[#0063c7] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isPaymentProcessing ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Pagar Agora'
                )}
              </button>
              
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-full mt-4 py-2 text-gray-400 text-sm hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
