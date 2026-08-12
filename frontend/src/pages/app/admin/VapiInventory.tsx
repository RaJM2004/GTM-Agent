import { useState, useEffect, useCallback } from 'react';
import { Mic, Archive, RefreshCw, Search } from 'lucide-react';

interface VapiAssistant {
  campaign_id: string;
  name: string;
  user_id: string;
  vapi_assistant_id: string;
  status: string;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminVapiInventory() {
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAssistants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/vapi-assistants`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch assistants');
      const data = await res.json();
      setAssistants(data.assistants || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load assistants', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  const archiveAssistant = async (campaignId: string) => {
    if (!confirm('Force-archive this Vapi assistant? This will set the campaign status to Archived.')) return;
    setActionLoading(campaignId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/vapi-assistants/${campaignId}/archive`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Archive failed');
      showToast('Assistant archived successfully', 'success');
      fetchAssistants();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = assistants.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.vapi_assistant_id?.toLowerCase().includes(search.toLowerCase()) ||
      a.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    if (status === 'Active') return 'bg-green-100 text-green-700';
    if (status === 'Archived') return 'bg-gray-100 text-gray-600';
    if (status === 'Paused') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Mic className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vapi Assistant Inventory</h1>
            <p className="text-sm text-gray-500">Total: {assistants.length} provisioned assistants</p>
          </div>
        </div>
        <button
          onClick={fetchAssistants}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by campaign name, assistant ID, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Assistants', value: assistants.length, color: 'bg-purple-50 text-purple-700' },
          { label: 'Active', value: assistants.filter((a) => a.status === 'Active').length, color: 'bg-green-50 text-green-700' },
          { label: 'Archived', value: assistants.filter((a) => a.status === 'Archived').length, color: 'bg-gray-50 text-gray-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color} border border-current/10`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Campaign', 'User ID', 'Vapi Assistant ID', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.campaign_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{a.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{a.user_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{a.vapi_assistant_id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(a.status)}`}>
                        {a.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.status !== 'Archived' && (
                        <button
                          onClick={() => archiveAssistant(a.campaign_id)}
                          disabled={actionLoading === a.campaign_id}
                          title="Force archive this assistant"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      No Vapi assistants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
