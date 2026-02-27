import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface AdminConsoleProps {
  onLogout: () => void;
}

interface ClientData extends User {
  plan: 'Free' | 'Pro' | 'Scale';
  storageUsed: string; // e.g., "45MB/500MB"
  adhesionDate: string; // e.g., "2023-01-15"
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onLogout }) => {
  const { user, token, t } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'master' || !token) {
      // Redirect or show unauthorized message if not master admin
      setError(t('unauthorized_access'));
      setLoading(false);
      return;
    }

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/admin/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(t('failed_to_fetch_clients'));
        }
        const data: ClientData[] = await response.json();
        setClients(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [user, token, t]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-lg">{t('loading_clients')}</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500 text-lg">{error}</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">{t('ecom360_management')}</h1>
      <p className="text-lg mb-4">{t('total_billing')}: <span className="font-semibold">€ 0.00</span></p>

      <div className="overflow-x-auto bg-slate-800 rounded-lg shadow-lg">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{t('name_email')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{t('current_plan')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{t('storage_used')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{t('adhesion_date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">{client.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{client.plan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{client.storageUsed}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{client.adhesionDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminConsole;
