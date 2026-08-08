import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, UserCheck, UserX, Bell, Search, ChevronLeft, ChevronRight, Coins, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface UserRecord {
  user_id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  is_active: boolean;
  auth_provider: string;
  token_balance: number;
  campaign_count: number;
  lead_count: number;
  created_at: string;
}

const API_BASE = 'http://localhost:8000';

export default function AdminUsers() {
  const { user: currentUser, checkSession } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tokenModalUser, setTokenModalUser] = useState<UserRecord | null>(null);
  const [tokenAmountInput, setTokenAmountInput] = useState('');
  const LIMIT = 20;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users?page=${page}&limit=${LIMIT}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const action = currentStatus ? 'deactivated' : 'activated';
      showToast(`User ${action} successfully`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const sendReconnectNotification = async (userId: string) => {
    setActionLoading(`notify-${userId}`);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/notify-reconnect`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to send notification');
      showToast('Reconnect notification sent', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const submitAddTokens = async () => {
    if (!tokenModalUser) return;
    const amount = Number(tokenAmountInput);
    if (isNaN(amount) || tokenAmountInput.trim() === '') {
      showToast("Invalid amount", "error");
      return;
    }

    setActionLoading(`tokens-${tokenModalUser.user_id}`);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${tokenModalUser.user_id}/add-tokens`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error('Failed to update tokens');
      const data = await res.json();
      showToast(`Successfully updated tokens. New balance: ${data.new_balance.toLocaleString()}`, 'success');
      setTokenModalUser(null);
      fetchUsers();
      if (currentUser?.user_id === tokenModalUser.user_id) {
        checkSession();
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / LIMIT);

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
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Total: {total} users</p>
          </div>
        </div>
        <button
          onClick={fetchUsers}
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
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
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
                  {['Name / Email', 'Role', 'Status', 'Campaigns', 'Leads', 'Tokens', 'Auth', 'Joined', 'Actions'].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{user.name || '—'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          user.is_active !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.is_active !== false ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{user.campaign_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{user.lead_count ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {(user.token_balance ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {user.auth_provider || 'local'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleStatus(user.user_id, user.is_active !== false)}
                          disabled={actionLoading === user.user_id}
                          title={user.is_active !== false ? 'Deactivate user' : 'Activate user'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active !== false
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {user.is_active !== false ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => sendReconnectNotification(user.user_id)}
                          disabled={actionLoading === `notify-${user.user_id}`}
                          title="Send reconnect integration notification"
                          className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors disabled:opacity-50"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTokenModalUser(user);
                            setTokenAmountInput('');
                          }}
                          disabled={actionLoading === `tokens-${user.user_id}`}
                          title="Assign tokens"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Token Modal */}
      {tokenModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Assign Tokens
              </h3>
              <button onClick={() => setTokenModalUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">User: <span className="font-semibold text-gray-900">{tokenModalUser.name || tokenModalUser.email}</span></p>
              <p className="text-sm text-gray-600">Current Balance: <span className="font-semibold text-primary">{(tokenModalUser.token_balance ?? 0).toLocaleString()}</span></p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tokens to Add (or subtract)</label>
              <input
                type="number"
                value={tokenAmountInput}
                onChange={(e) => setTokenAmountInput(e.target.value)}
                placeholder="e.g. 5000 or -1000"
                className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTokenModalUser(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAddTokens}
                disabled={actionLoading === `tokens-${tokenModalUser.user_id}` || !tokenAmountInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {actionLoading === `tokens-${tokenModalUser.user_id}` ? 'Saving...' : 'Assign Tokens'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
