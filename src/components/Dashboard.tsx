import { ShieldCheck, LogOut, Plus, Wifi, WifiOff, X, Trash2, Landmark, Share2, FolderPlus, Save, Users, CreditCard, Check, Cloud, CloudOff, RefreshCw, Paperclip, Image as ImageIcon, FileText, UploadCloud, Eye, Download, Lock, ArrowLeft, Delete, Key, Copy, Globe, FileJson, HelpCircle, Send } from 'lucide-react';
import { useState, useEffect, useRef, ChangeEvent, DragEvent, MouseEvent } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Language, translations } from '../translations';

interface DashboardProps {
  onLogout: () => void;
  userPin: string;
  masterKey: string;
  initialRecoveryLog?: boolean;
  lang: Language;
  setLang: (lang: Language) => void;
}

interface Category {
  id: string;
  name: string;
  icon: 'bank' | 'social' | 'custom';
  isFixed: boolean;
  color: string;
}

interface Attachment {
  type: 'image' | 'pdf';
  url: string;
  name: string;
}

interface SavedItem {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  timestamp: Date;
  syncStatus: 'synced' | 'pending';
  attachment?: Attachment;
}

interface Guest {
  id: string;
  email: string;
  allowedCategories: string[];
}

interface ActivityLog {
  id: string;
  action: 'save' | 'delete';
  itemName: string;
  timestamp: Date;
}

export function Dashboard({ onLogout, userPin, masterKey, initialRecoveryLog, lang, setLang }: DashboardProps) {
  const t = translations[lang];
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO' | 'SCALE'>('PRO'); // Default to PRO for demo
  const [storageUsed, setStorageUsed] = useState(12); // MB
  const [storageLimit, setStorageLimit] = useState(200); // MB
  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const initialLogs: ActivityLog[] = [
      {
        id: 'biometric-log',
        action: 'save',
        itemName: t.dashboard.activity.biometricSuccess,
        timestamp: new Date()
      }
    ];

    if (initialRecoveryLog) {
      initialLogs.unshift({
        id: 'recovery-log',
        action: 'save',
        itemName: t.dashboard.activity.recoveryStarted,
        timestamp: new Date()
      });
    }

    return initialLogs;
  });
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: lang === 'pt' ? 'Bancos' : lang === 'en' ? 'Banks' : 'Bancos', icon: 'bank', isFixed: true, color: 'bg-blue-500' },
    { id: '2', name: lang === 'pt' ? 'Social' : lang === 'en' ? 'Social' : 'Social', icon: 'social', isFixed: true, color: 'bg-purple-500' },
  ]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Category View State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Delete Confirmation State
  const [deleteType, setDeleteType] = useState<'item' | 'category' | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Add Item State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  // Support State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleExportData = () => {
    const dataToExport = {
      user: 'Safe360 User',
      exportDate: new Date().toISOString(),
      categories: categories.map(c => ({
        name: c.name,
        items: items.filter(i => i.categoryId === c.id).map(i => ({
          title: i.title,
          description: i.description,
          timestamp: i.timestamp,
          attachment: i.attachment ? {
            name: i.attachment.name,
            type: i.attachment.type,
            url: i.attachment.url
          } : null
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safe360-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActivities(prev => [{
      id: Math.random().toString(),
      action: 'save',
      itemName: t.dashboard.activity.exportDone,
      timestamp: new Date()
    }, ...prev]);

    showToast(t.dashboard.toasts.saved);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    setActivities(prev => [{
      id: Math.random().toString(),
      action: 'save',
      itemName: t.dashboard.activity.langChanged.replace('{lang}', newLang.toUpperCase()),
      timestamp: new Date()
    }, ...prev]);
  };

  // Item Detail State
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);

  // Guest Management State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Security Settings State
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);

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

  // Sync logic when coming online
  useEffect(() => {
    if (isOnline) {
      const pendingItems = items.filter(i => i.syncStatus === 'pending');
      if (pendingItems.length > 0) {
        setIsSyncing(true);
        // Simulate sync to Ecom360.co cloud
        setTimeout(() => {
          setItems(prev => prev.map(item => 
            item.syncStatus === 'pending' ? { ...item, syncStatus: 'synced' } : item
          ));
          setIsSyncing(false);
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
      }, 2000);
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const handleSyncNow = () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    // Simulate sync
    setTimeout(() => {
      setItems(prev => prev.map(item => 
        item.syncStatus === 'pending' ? { ...item, syncStatus: 'synced' } : item
      ));
      setIsSyncing(false);
      showToast(t.dashboard.toasts.synced);
    }, 2000);
  };

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
      
      // Add Activity Log
      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'save',
        itemName: t.dashboard.activity.folderCreated.replace('{name}', newCategoryName),
        timestamp: new Date()
      }, ...prev]);
    }
  };

  const handleDeleteCategory = (id: string) => {
    setDeleteType('category');
    setIdToDelete(id);
    setDeletePin('');
    setDeleteError('');
    setShowDeleteConfirmModal(true);
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleDeleteItemRequest = (itemId: string, e: MouseEvent) => {
    e.stopPropagation();
    setDeleteType('item');
    setIdToDelete(itemId);
    setDeletePin('');
    setDeleteError('');
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletePin === userPin) {
      if (deleteType === 'item' && idToDelete) {
        const item = items.find(i => i.id === idToDelete);
        if (item) {
          setItems(prev => prev.filter(i => i.id !== idToDelete));
          // Add Activity Log
          setActivities(prev => [{
            id: Date.now().toString(),
            action: 'delete',
            itemName: t.dashboard.activity.deleted.replace('{name}', item.title),
            timestamp: new Date()
          }, ...prev]);
          // Simulate storage decrease
          setStorageUsed(prev => Math.max(prev - (item.attachment ? 2.5 : 0.5), 0));
          showToast(t.dashboard.toasts.deleted);
        }
      } else if (deleteType === 'category' && idToDelete) {
        const category = categories.find(c => c.id === idToDelete);
        if (category) {
          setCategories(prev => prev.filter(c => c.id !== idToDelete));
          // Optionally delete items in this category or move them to 'Uncategorized'
          // For strict isolation, let's delete them
          const itemsToDelete = items.filter(i => i.categoryId !== idToDelete);
          setItems(prev => prev.filter(i => i.categoryId !== idToDelete));
          
          // Add Activity Log
          setActivities(prev => [{
            id: Date.now().toString(),
            action: 'delete',
            itemName: t.dashboard.activity.folderDeleted.replace('{name}', category.name),
            timestamp: new Date()
          }, ...prev]);
          showToast(t.dashboard.toasts.deleted);
        }
      }
      
      setShowDeleteConfirmModal(false);
      setIdToDelete(null);
      setDeleteType(null);
      // Close detail modal if open
      setSelectedItem(null);
    } else {
      setDeleteError(t.dashboard.security.masterKey.error);
      
      // Add Activity Log for failed attempt
      let targetName = lang === 'pt' ? 'Item desconhecido' : lang === 'en' ? 'Unknown item' : 'Elemento desconocido';
      if (deleteType === 'item') {
        const item = items.find(i => i.id === idToDelete);
        if (item) targetName = item.title;
      } else if (deleteType === 'category') {
        const category = categories.find(c => c.id === idToDelete);
        if (category) targetName = (lang === 'pt' ? 'Pasta ' : lang === 'en' ? 'Folder ' : 'Carpeta ') + category.name;
      }

      setActivities(prev => [{
        id: Date.now().toString(),
        action: 'delete',
        itemName: (lang === 'pt' ? '🔐 Tentativa de exclusão em ' : lang === 'en' ? '🔐 Deletion attempt in ' : '🔐 Intento de eliminación en ') + targetName,
        timestamp: new Date()
      }, ...prev]);
    }
  };

  const handleOpenAddItem = (categoryId: string) => {
    setSelectedCategoryForAdd(categoryId);
    setNewItemTitle('');
    setNewItemDescription('');
    setNewItemFile(null);
    setShowFabMenu(false);
    setShowAddItemModal(true);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewItemFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (userPlan === 'FREE') return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
        setNewItemFile(file);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleSaveItem = () => {
    if (!selectedCategoryForAdd || !newItemTitle.trim()) return;

    let attachment: Attachment | undefined;
    if (newItemFile) {
      attachment = {
        type: newItemFile.type === 'application/pdf' ? 'pdf' : 'image',
        url: URL.createObjectURL(newItemFile),
        name: newItemFile.name
      };
    }

    const newItem: SavedItem = {
      id: Date.now().toString(),
      title: newItemTitle,
      description: newItemDescription,
      categoryId: selectedCategoryForAdd,
      timestamp: new Date(),
      syncStatus: isOnline ? 'synced' : 'pending',
      attachment
    };
    
    setItems(prev => [newItem, ...prev]);
    
    // Add Activity Log
    setActivities(prev => [{
      id: Date.now().toString(),
      action: 'save',
      itemName: t.dashboard.activity.sync.replace('{name}', newItemTitle),
      timestamp: new Date()
    }, ...prev]);

    // Simulate storage increase (0.5MB per item, 2MB per attachment)
    setStorageUsed(prev => Math.min(prev + (attachment ? 2.5 : 0.5), storageLimit));
    
    showToast(t.dashboard.toasts.saved);

    setShowAddItemModal(false);
  };

  const handleAddGuest = () => {
    if (newGuestEmail.trim()) {
      const newGuest: Guest = {
        id: Date.now().toString(),
        email: newGuestEmail,
        allowedCategories: []
      };
      setGuests([...guests, newGuest]);
      setNewGuestEmail('');
      setShowEmailInput(false);
    }
  };

  const toggleGuestPermission = (guestId: string, categoryId: string) => {
    setGuests(guests.map(guest => {
      if (guest.id === guestId) {
        const isAllowed = guest.allowedCategories.includes(categoryId);
        return {
          ...guest,
          allowedCategories: isAllowed
            ? guest.allowedCategories.filter(id => id !== categoryId)
            : [...guest.allowedCategories, categoryId]
        };
      }
      return guest;
    }));
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
            <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
              <Globe size={14} className="text-gray-500 ml-1" />
              <select 
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-transparent text-[10px] font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer pr-1 uppercase"
              >
                <option value="pt">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-300 ${
              isOnline 
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden sm:inline">
                {isOnline ? t.dashboard.nav.online : t.dashboard.nav.offline}
              </span>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                isSyncing
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 cursor-wait'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{isSyncing ? t.dashboard.nav.syncing : t.dashboard.nav.syncNow}</span>
            </button>
            
            <button
              onClick={() => setShowAccessModal(true)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              title={t.dashboard.nav.access}
            >
              <Users size={20} />
            </button>

            <button 
              onClick={() => setShowSecuritySettings(true)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              title={t.dashboard.nav.security}
            >
              <ShieldCheck size={20} />
            </button>

            <button 
              onClick={() => setShowSupportModal(true)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              title={t.dashboard.support.title}
            >
              <HelpCircle size={20} />
            </button>

            <ThemeToggle />
            
            <button 
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title={t.dashboard.nav.logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedCategory ? (
          // Category Detail View
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>{lang === 'pt' ? 'Voltar' : lang === 'en' ? 'Back' : 'Volver'}</span>
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className={`w-16 h-16 rounded-2xl ${selectedCategory.color} flex items-center justify-center shadow-lg shadow-blue-900/5`}>
                {getIcon(selectedCategory.icon)}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedCategory.name}</h1>
            </div>

            {items.filter(i => i.categoryId === selectedCategory.id).length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {items.filter(i => i.categoryId === selectedCategory.id).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItem(item)}
                      className="p-4 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1">
                          <Save size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{item.title}</p>
                            {item.attachment && (
                              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0" title={t.dashboard.itemDetail.attachment}>
                                {item.attachment.type === 'image' ? <ImageIcon size={16} /> : <Paperclip size={16} />}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {item.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4 mt-1">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs font-medium">
                          {item.syncStatus === 'synced' ? <Cloud size={12} /> : <CloudOff size={12} />}
                          <span className="hidden sm:inline">{item.syncStatus === 'synced' ? t.dashboard.items.synced : t.dashboard.items.pending}</span>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteItemRequest(item.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title={t.dashboard.items.delete}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <FolderPlus size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t.dashboard.categories.empty}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t.dashboard.categories.emptySub}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.dashboard.categories.title}</h1>
              
              {/* Storage Bar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 w-full sm:w-64">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{t.dashboard.storage.label}</span>
                  <span className="text-gray-900 dark:text-white font-bold">{storageUsed.toFixed(1)}MB <span className="text-gray-400 font-normal">{t.dashboard.storage.of} {storageLimit}MB</span></span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      (storageUsed / storageLimit) >= 0.9 
                        ? 'bg-orange-500' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${(storageUsed / storageLimit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Categories Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
              {categories.map((category) => (
                <div 
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="group relative aspect-square bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center p-4 transition-all cursor-pointer active:scale-95"
                >
                  <div className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mb-3 shadow-lg shadow-blue-900/5`}>
                    {getIcon(category.icon)}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white text-center">
                    {category.isFixed ? (category.id === '1' ? t.dashboard.categories.banks : t.dashboard.categories.social) : category.name}
                  </span>
                  
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
                <span className="font-medium">{t.dashboard.categories.new}</span>
              </button>
            </div>

            {/* Recent Items List (Only show if not in category view) */}
            {items.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.dashboard.items.recent}</h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {items.slice(0, 5).map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Save size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                              {item.attachment && (
                                <span className="text-gray-400 dark:text-gray-500" title={t.dashboard.itemDetail.attachment}>
                                  {item.attachment.type === 'image' ? <ImageIcon size={14} /> : <Paperclip size={14} />}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.timestamp.toLocaleTimeString()} • {categories.find(c => c.id === item.categoryId)?.name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.syncStatus === 'synced' ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                              <Cloud size={12} />
                              <span className="hidden sm:inline">{t.dashboard.nav.online}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                              <CloudOff size={12} />
                              <span className="hidden sm:inline">{t.dashboard.nav.offline}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => handleDeleteItemRequest(item.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title={t.dashboard.items.delete}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity Log */}
            {activities.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.dashboard.activity.title}</h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {activities.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-4 flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.action === 'save' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {log.action === 'save' ? <Save size={14} /> : <Trash2 size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.itemName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {log.timestamp.toLocaleDateString()} {t.dashboard.activity.at} {log.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.dashboard.fab.question}</h3>
              <button onClick={() => setShowFabMenu(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleOpenAddItem(category.id)}
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

      {/* Security Settings Modal */}
      {showSecuritySettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.dashboard.nav.security}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.security.subtitle}</p>
                </div>
              </div>
              <button onClick={() => {
                setShowSecuritySettings(false);
                setShowMasterKey(false);
                setSecurityPin('');
                setSecurityError('');
              }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Export Data Button */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <FileJson size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.dashboard.security.export.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{t.dashboard.security.export.subtitle}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleExportData}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download size={14} />
                  {t.dashboard.security.export.button}
                </button>
              </div>

              {/* Auto Lock Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.dashboard.security.autoLock.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.security.autoLock.subtitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAutoLockEnabled(!autoLockEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${autoLockEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoLockEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Master Key Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key size={16} className="text-blue-600" />
                  {t.dashboard.security.masterKey.title}
                </h4>
                
                {!showMasterKey ? (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-center space-y-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.dashboard.security.masterKey.confirmPin}
                    </p>
                    <div className="flex justify-center gap-2">
                      <input
                        type="password"
                        maxLength={8}
                        value={securityPin}
                        onChange={(e) => setSecurityPin(e.target.value)}
                        placeholder={t.dashboard.security.masterKey.placeholder}
                        className="w-32 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          if (securityPin === userPin) {
                            setShowMasterKey(true);
                            setSecurityError('');
                          } else {
                            setSecurityError(t.dashboard.security.masterKey.error);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        {t.dashboard.security.masterKey.showButton}
                      </button>
                    </div>
                    {securityError && <p className="text-red-500 text-xs font-medium">{securityError}</p>}
                  </div>
                ) : (
                  <div className="animate-in zoom-in duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 text-center space-y-3">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-bold">{t.dashboard.security.masterKey.label}</p>
                      <code className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider block">
                        {masterKey}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(masterKey);
                          showToast(t.dashboard.toasts.copied);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <Copy size={12} /> {t.dashboard.security.masterKey.copy}
                      </button>
                    </div>
                    <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                      {t.dashboard.security.masterKey.warning}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
              <button 
                onClick={() => {
                  setShowSecuritySettings(false);
                  setShowMasterKey(false);
                  setSecurityPin('');
                  setSecurityError('');
                }}
                className="w-full py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t.dashboard.security.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.dashboard.addItem.title}</h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.dashboard.addItem.labelTitle}</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder={t.dashboard.addItem.placeholderTitle}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.dashboard.addItem.labelDescription}</label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder={t.dashboard.addItem.placeholderDescription}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.dashboard.addItem.labelAttachment}</label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    userPlan === 'FREE' 
                      ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 cursor-not-allowed' 
                      : 'border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer bg-gray-50 dark:bg-slate-800/30'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => userPlan !== 'FREE' && fileInputRef.current?.click()}
                >
                  {userPlan === 'FREE' && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl z-10">
                      <Lock className="text-gray-400 mb-2" size={24} />
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300 px-4">
                        {t.dashboard.items.freeLock}
                      </p>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    disabled={userPlan === 'FREE'}
                  />

                  {newItemFile ? (
                    <div className="flex flex-col items-center">
                      {newItemFile.type.startsWith('image/') ? (
                        <div className="relative w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800">
                          <img 
                            src={URL.createObjectURL(newItemFile)} 
                            alt="Preview" 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <FileText size={48} className="text-blue-500 mb-2" />
                      )}
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-full px-4">
                        {newItemFile.name}
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewItemFile(null);
                        }}
                        className="mt-2 text-xs text-red-500 hover:underline"
                      >
                        {lang === 'pt' ? 'Remover' : lang === 'en' ? 'Remove' : 'Eliminar'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                      <UploadCloud size={32} className="mb-2" />
                      <p className="text-sm">{t.dashboard.addItem.dropzone}</p>
                      <p className="text-xs mt-1 opacity-70">PDF, PNG, JPG</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveItem}
                disabled={!newItemTitle.trim()}
                className="w-full py-4 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
              >
                {t.dashboard.addItem.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedItem.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedItem.timestamp.toLocaleDateString()} {lang === 'pt' ? 'às' : lang === 'en' ? 'at' : 'a las'} {selectedItem.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>

            {selectedItem.description && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {selectedItem.attachment ? (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {selectedItem.attachment.type === 'image' ? (
                      <ImageIcon size={20} className="text-blue-500" />
                    ) : (
                      <FileText size={20} className="text-red-500" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[200px]">
                      {selectedItem.attachment.name}
                    </span>
                  </div>
                  <a 
                    href={selectedItem.attachment.url} 
                    download={selectedItem.attachment.name}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={20} />
                  </a>
                </div>

                {selectedItem.attachment.type === 'image' && (
                  <div className="rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                    <img 
                      src={selectedItem.attachment.url} 
                      alt="Attachment" 
                      className="w-full h-auto max-h-[300px] object-contain"
                    />
                  </div>
                )}
                
                {selectedItem.attachment.type === 'pdf' && (
                  <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                    <FileText size={48} className="text-gray-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-gray-500">{lang === 'pt' ? 'Visualização de PDF não disponível' : lang === 'en' ? 'PDF preview not available' : 'Vista previa de PDF no disponible'}</p>
                    <a 
                      href={selectedItem.attachment.url} 
                      download={selectedItem.attachment.name}
                      className="mt-4 text-sm font-medium text-blue-600 hover:underline"
                    >
                      {lang === 'pt' ? 'Baixar PDF' : lang === 'en' ? 'Download PDF' : 'Descargar PDF'}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                <p>{lang === 'pt' ? 'Nenhum anexo neste item.' : lang === 'en' ? 'No attachment for this item.' : 'Sin adjuntos en este elemento.'}</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                {lang === 'pt' ? 'Fechar' : lang === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{lang === 'pt' ? 'Nova Categoria' : lang === 'en' ? 'New Category' : 'Nueva Categoría'}</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={lang === 'pt' ? 'Nome da categoria (ex: Viagens)' : lang === 'en' ? 'Category name (ex: Travel)' : 'Nombre de la categoría (ej: Viajes)'}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddCategory(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {lang === 'pt' ? 'Cancelar' : lang === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'pt' ? 'Criar' : lang === 'en' ? 'Create' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Management Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 dark:border-slate-800 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{t.dashboard.nav.access}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'pt' ? 'Controle quem visualiza seus dados' : lang === 'en' ? 'Control who views your data' : 'Controla quién ve tus datos'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAccessModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-8">
              <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-wider pl-1">{t.dashboard.access.guestsTitle}</h4>
              {guests.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700/50">
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t.dashboard.access.noGuests}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t.dashboard.access.noGuestsSub}</p>
                </div>
              ) : (
                <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {guests.map((guest) => (
                    <li key={guest.id} className="p-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                            {guest.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-900 dark:text-white font-medium text-sm">{guest.email}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-2.5 py-1 rounded-full uppercase tracking-wide">{t.dashboard.access.active}</span>
                      </div>
                      
                      <div className="space-y-3 pl-11">
                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t.dashboard.access.permissions}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {categories.map(category => (
                            <label key={category.id} className="flex items-center gap-2.5 cursor-pointer group p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
                              <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                  type="checkbox"
                                  className="peer appearance-none w-4 h-4 rounded border border-gray-300 dark:border-slate-600 checked:bg-blue-600 checked:border-blue-600 transition-all"
                                  checked={guest.allowedCategories.includes(category.id)}
                                  onChange={() => toggleGuestPermission(guest.id, category.id)}
                                />
                                <Check size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                              </div>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                {category.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!showEmailInput ? (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98] transition-all"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>{t.dashboard.access.addExtra}</span>
                <span className="bg-blue-500/30 px-2 py-0.5 rounded text-xs ml-1">€ 2,00</span>
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{t.dashboard.access.emailLabel}</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                    placeholder={t.dashboard.access.emailPlaceholder}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={handleAddGuest}
                    disabled={!newGuestEmail.trim()}
                    className="px-5 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-green-600/20 transition-all"
                  >
                    {t.dashboard.access.invite}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulated Revolut Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#121212] rounded-[32px] w-full max-w-[360px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="bg-[#191919] text-white p-6 pb-8 flex justify-between items-start relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-[#191919] font-bold text-xs">R</div>
                  <h3 className="font-bold text-lg tracking-tight">Revolut</h3>
                </div>
                <p className="text-white/60 text-xs font-medium">Checkout Seguro</p>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm relative z-10">
                <CreditCard size={20} className="text-white" />
              </div>
              
              {/* Decorative background blur */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            </div>
            
            <div className="px-8 py-8 -mt-4 bg-white dark:bg-[#121212] rounded-t-[24px] relative z-20">
              <div className="text-center mb-8">
                <p className="text-gray-400 dark:text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Total a pagar</p>
                <h2 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tighter">€ 2,00</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{t.dashboard.payment.beneficiary}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <ShieldCheck size={10} />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">Safe360 Ltd.</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{t.dashboard.payment.product}</span>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{t.dashboard.payment.extraUser}</span>
                </div>
              </div>

              <button
                onClick={handlePaymentSuccess}
                disabled={isPaymentProcessing}
                className="w-full py-4 rounded-2xl bg-[#0075EB] text-white font-bold text-lg hover:bg-[#0063c7] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
              >
                {isPaymentProcessing ? (
                  <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t.dashboard.payment.payNow
                )}
              </button>
              
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-full mt-4 py-2 text-gray-400 dark:text-gray-500 text-sm font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {t.dashboard.payment.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-red-100 dark:border-red-900/30">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {deleteType === 'category' ? t.dashboard.deleteConfirm.titleCategory : t.dashboard.deleteConfirm.titleItem}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t.dashboard.deleteConfirm.subtitle}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-center gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      i < deletePin.length
                        ? 'bg-red-500 scale-110'
                        : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {deleteError && (
                <p className="text-red-500 text-xs text-center mb-4 font-medium animate-pulse">
                  {deleteError}
                </p>
              )}

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      if (deletePin.length < 8) {
                        setDeletePin(prev => prev + num);
                        setDeleteError('');
                      }
                    }}
                    className="aspect-square rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-xl font-medium text-gray-900 dark:text-white transition-colors flex items-center justify-center active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <div className="aspect-square"></div>
                <button
                  onClick={() => {
                    if (deletePin.length < 8) {
                      setDeletePin(prev => prev + '0');
                      setDeleteError('');
                    }
                  }}
                  className="aspect-square rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-xl font-medium text-gray-900 dark:text-white transition-colors flex items-center justify-center active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={() => setDeletePin(prev => prev.slice(0, -1))}
                  className="aspect-square rounded-full bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors flex items-center justify-center active:scale-95"
                >
                  <Delete size={24} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletePin('');
                  setDeleteError('');
                  setIdToDelete(null);
                  setDeleteType(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium"
              >
                {t.dashboard.deleteConfirm.cancel}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletePin.length < 4}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-red-600/20"
              >
                {t.dashboard.deleteConfirm.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/20 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.dashboard.support.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.support.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSupportModal(false);
                  setSupportMessage('');
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.dashboard.support.messageLabel}
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder={t.dashboard.support.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-32"
                />
              </div>

              <button
                onClick={() => {
                  if (!supportMessage.trim()) return;
                  setIsSendingSupport(true);
                  setTimeout(() => {
                    setIsSendingSupport(false);
                    setShowSupportModal(false);
                    setSupportMessage('');
                    showToast(t.dashboard.support.success);
                  }, 1500);
                }}
                disabled={!supportMessage.trim() || isSendingSupport}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {isSendingSupport ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    {t.dashboard.support.send}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
