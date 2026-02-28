import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, HardDrive, Calendar, ChevronRight, Search, Crown, UserCheck, ArrowUpCircle, ArrowLeft } from 'lucide-react';

interface AdminConsoleProps {
  onLogout: () => void;
  onBack?: () => void;
}

interface GuestData {
  id: string;
  email: string;
  role: string;
  storageMB: number;
  createdAt: string | null;
}

interface AdminData {
  id: string;
  email: string;
  role: string;
  plan: 'Free' | 'Pro' | 'Scale';
  storageMB: number;
  maxStorageMB: number;
  createdAt: string | null;
  planExpiresAt: string | null;
  guests: GuestData[];
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onLogout, onBack }) => {
  const { user, token, t } = useAuth();
  const a = t.admin;
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'master' || !token) {
      setError(a.unauthorized);
      setLoading(false);
      return;
    }
    fetchClients();
  }, [user, token]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/clients', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(a.fetch_error);
      const data: AdminData[] = await response.json();
      setAdmins(data);
      if (data.length > 0 && !selectedAdminId) {
        setSelectedAdminId(data[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (adminId: string, newPlan: 'Free' | 'Pro' | 'Scale') => {
    setChangingPlan(true);
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(`/api/admin/clients/${adminId}/plan`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: newPlan, planExpiresAt: expiresAt }),
      });
      if (!response.ok) throw new Error('Failed to update plan');
      showToast(a.plan_updated);
      await fetchClients();
    } catch (err) {
      showToast(a.plan_error);
    } finally {
      setChangingPlan(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedAdmin = admins.find(ad => ad.id === selectedAdminId) || null;

  const filteredAdmins = admins.filter(ad =>
    ad.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const daysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const planColors: Record<string, string> = {
    Free: 'bg-slate-600 text-slate-200',
    Pro: 'bg-blue-600 text-white',
    Scale: 'bg-purple-600 text-white',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg text-slate-300">{a.loading}</span>
      </div>
    );
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500 text-lg">{error}</div>;
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </button>
          )}
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            {a.management}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {admins.length} {a.owners}
          </p>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={a.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Admin list */}
        <nav className="flex-1 overflow-y-auto">
          {filteredAdmins.map(admin => (
            <button
              key={admin.id}
              onClick={() => setSelectedAdminId(admin.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2 ${
                selectedAdminId === admin.id
                  ? 'bg-slate-700/50 border-blue-500 text-white'
                  : 'border-transparent text-slate-300 hover:bg-slate-700/30 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0">
                {admin.role === 'master' ? (
                  <Crown className="w-5 h-5 text-yellow-400" />
                ) : (
                  <UserCheck className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{admin.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${planColors[admin.plan]}`}>
                    {admin.plan}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {admin.guests.length} {a.guests_count}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </button>
          ))}
        </nav>
      </aside>

      {/* Main panel */}
      <main className="flex-1 overflow-y-auto">
        {selectedAdmin ? (
          <div className="p-6 max-w-4xl">
            {/* Owner header */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedAdmin.role === 'master' ? (
                      <Crown className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-blue-400" />
                    )}
                    {selectedAdmin.email}
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedAdmin.role === 'master' ? 'Master Admin' : 'Owner / Admin'}
                  </p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${planColors[selectedAdmin.plan]}`}>
                  {selectedAdmin.plan}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                {/* Adhesion date */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {a.adhesion}
                  </div>
                  <p className="text-white font-semibold">{formatDate(selectedAdmin.createdAt)}</p>
                </div>

                {/* Expiry date */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {a.expiry}
                  </div>
                  <p className={`font-semibold ${isExpired(selectedAdmin.planExpiresAt) ? 'text-red-400' : 'text-white'}`}>
                    {formatDate(selectedAdmin.planExpiresAt)}
                    {(() => {
                      const days = daysUntilExpiry(selectedAdmin.planExpiresAt);
                      if (days !== null && days <= 30 && days > 0) {
                        return <span className="text-xs text-yellow-400 ml-1">({days}d)</span>;
                      }
                      if (days !== null && days <= 0) {
                        return <span className="text-xs text-red-400 ml-1">({a.expired})</span>;
                      }
                      return null;
                    })()}
                  </p>
                </div>

                {/* Guest count */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    {a.guests_count}
                  </div>
                  <p className="text-white font-semibold">{selectedAdmin.guests.length}</p>
                </div>
              </div>

              {/* Storage bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" />
                    {a.storage}
                  </span>
                  <span className="text-white font-medium">
                    {selectedAdmin.storageMB}MB / {selectedAdmin.maxStorageMB}MB
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      selectedAdmin.storageMB / selectedAdmin.maxStorageMB > 0.9
                        ? 'bg-red-500'
                        : selectedAdmin.storageMB / selectedAdmin.maxStorageMB > 0.7
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((selectedAdmin.storageMB / selectedAdmin.maxStorageMB) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Change plan */}
              {selectedAdmin.role !== 'master' && (
                <div className="mt-6 pt-4 border-t border-slate-600">
                  <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                    <ArrowUpCircle className="w-4 h-4" />
                    {a.change_plan}
                  </h3>
                  <div className="flex gap-2">
                    {(['Free', 'Pro', 'Scale'] as const).map(plan => (
                      <button
                        key={plan}
                        disabled={changingPlan || selectedAdmin.plan === plan}
                        onClick={() => handleChangePlan(selectedAdmin.id, plan)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedAdmin.plan === plan
                            ? `${planColors[plan]} ring-2 ring-offset-2 ring-offset-slate-800 ring-blue-400 cursor-default`
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        } disabled:opacity-50`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Guests section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  {a.guests_title} ({selectedAdmin.guests.length})
                </h2>
              </div>

              {selectedAdmin.guests.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{a.no_guests}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {selectedAdmin.guests.map(guest => (
                    <div key={guest.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-300">
                            {guest.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-white">{guest.email}</p>
                          <p className="text-xs text-slate-400">
                            {guest.createdAt ? formatDate(guest.createdAt) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{a.storage}</p>
                          <p className="text-sm font-medium text-white">{guest.storageMB}MB</p>
                        </div>
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${Math.min((guest.storageMB / selectedAdmin.maxStorageMB) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>{a.select_owner}</p>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminConsole;
