import { useState, useEffect, useMemo } from 'react';
import { 
  MessageCircle, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  MessageSquareReply, 
  Eye, 
  SendHorizontal
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function WhatsAppLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'read' | 'seen_no_reply' | 'delivered' | 'replied' | 'sent' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      const data = await apiFetch('/api/whatsapp/logs');
      if (data.status === 'success') {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp logs:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs();
  };

  // Helper to categorize log
  const getLogCategory = (log: any): 'replied' | 'seen_no_reply' | 'read' | 'delivered' | 'sent' | 'failed' => {
    const s = String(log.status || '').toLowerCase();
    if (s === 'replied') return 'replied';
    if (s === 'failed') return 'failed';
    if (s === 'read') return 'read';
    if (s === 'delivered') return 'delivered';
    return 'sent';
  };

  // Metrics counts
  const stats = useMemo(() => {
    let sent = 0;
    let delivered = 0;
    let read = 0;
    let replied = 0;
    let failed = 0;

    logs.forEach(l => {
      const cat = getLogCategory(l);
      if (cat === 'replied') {
        replied++;
        read++;
        delivered++;
        sent++;
      } else if (cat === 'read') {
        read++;
        delivered++;
        sent++;
      } else if (cat === 'delivered') {
        delivered++;
        sent++;
      } else if (cat === 'sent') {
        sent++;
      } else if (cat === 'failed') {
        failed++;
      }
    });

    const seenNoReply = logs.filter(l => getLogCategory(l) === 'read').length;

    return { total: logs.length, sent, delivered, read, seenNoReply, replied, failed };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const cat = getLogCategory(log);

      // Tab filter
      if (activeTab === 'replied' && cat !== 'replied') return false;
      if (activeTab === 'read' && cat !== 'read' && cat !== 'replied') return false;
      if (activeTab === 'seen_no_reply' && cat !== 'read') return false;
      if (activeTab === 'delivered' && cat !== 'delivered') return false;
      if (activeTab === 'sent' && cat !== 'sent') return false;
      if (activeTab === 'failed' && cat !== 'failed') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const phone = String(log.phone_number || '').toLowerCase();
        const name = String(log.lead_name || '').toLowerCase();
        const msg = String(log.message || log.caption || '').toLowerCase();
        if (!phone.includes(query) && !name.includes(query) && !msg.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> WhatsApp Outreach & Delivery Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track live delivery ticks (Blue Tick, Delivered, Seen but No Reply, and Lead Replies).
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-[#F2DED6] hover:bg-gray-50 rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Sync Live Status'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'all' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Sent</span>
            <SendHorizontal className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div 
          onClick={() => setActiveTab('delivered')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'delivered' ? 'bg-gray-100 border-gray-400 shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-600 text-xs font-medium">
            <span>Delivered</span>
            <CheckCheck className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-gray-700">{stats.delivered}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Double Grey Tick</div>
        </div>

        <div 
          onClick={() => setActiveTab('read')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'read' ? 'bg-sky-50 border-sky-400 shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-sky-700 text-xs font-semibold">
            <span>Blue Tick (Read)</span>
            <CheckCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-sky-600">{stats.read}</div>
          <div className="text-[10px] text-sky-500 mt-0.5">Lead Opened Chat</div>
        </div>

        <div 
          onClick={() => setActiveTab('seen_no_reply')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'seen_no_reply' ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Seen (No Reply)</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600">{stats.seenNoReply}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">Read, No Response</div>
        </div>

        <div 
          onClick={() => setActiveTab('replied')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'replied' ? 'bg-green-50 border-green-400 shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-green-700 text-xs font-semibold">
            <span>Replied</span>
            <MessageSquareReply className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-green-600">{stats.replied}</div>
          <div className="text-[10px] text-green-500 mt-0.5">Inbound Responses</div>
        </div>

        <div 
          onClick={() => setActiveTab('failed')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            activeTab === 'failed' ? 'bg-red-50 border-red-400 shadow-sm' : 'bg-white border-[#F2DED6] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-red-700 text-xs font-medium">
            <span>Failed</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-[10px] text-red-400 mt-0.5">Bounced / No WA</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 hide-scrollbar">
          {[
            { id: 'all', label: 'All Messages' },
            { id: 'read', label: '✓✓ Blue Tick (Read)' },
            { id: 'seen_no_reply', label: '👁️ Seen (No Reply)' },
            { id: 'delivered', label: '✓✓ Delivered' },
            { id: 'replied', label: '💬 Replied' },
            { id: 'failed', label: '✕ Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-gray-600 border-[#F2DED6] hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search phone or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#F2DED6] rounded-xl py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm outline-none"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Stage</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Syncing WhatsApp logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-700">No logs found for this filter</p>
                    <p className="text-xs text-gray-400 mt-1">Try switching to another tab or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const cat = getLogCategory(log);

                  return (
                    <tr key={log.id || log._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Recipient */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{log.lead_name || 'Contact'}</span>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-700 font-medium">+{log.phone_number}</span>
                      </td>

                      {/* Message Preview */}
                      <td className="px-6 py-4 max-w-sm">
                        <p className="text-xs text-gray-600 line-clamp-2" title={log.message || log.caption}>
                          {log.message || log.caption || (log.type === 'image' ? '[Image Attachment]' : '—')}
                        </p>
                      </td>

                      {/* Status / Blue Tick / Replied Badges */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cat === 'replied' ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                              <MessageSquareReply className="w-3.5 h-3.5" />
                              Replied
                            </span>
                            {log.reply_message && (
                              <span className="text-[11px] text-gray-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded max-w-[200px] truncate font-sans" title={log.reply_message}>
                                "{log.reply_message}"
                              </span>
                            )}
                          </div>
                        ) : cat === 'read' ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 shadow-sm" title="Blue Tick: Lead has opened and read this message">
                              <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                              Blue Tick (Read)
                            </span>
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Seen, No Reply
                            </span>
                          </div>
                        ) : cat === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200" title="Double Grey Tick: Delivered to recipient device">
                            <CheckCheck className="w-3.5 h-3.5 text-gray-500" />
                            Delivered
                          </span>
                        ) : cat === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200" title={log.error}>
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200" title="Single Grey Tick: Sent to WhatsApp server">
                            <Check className="w-3.5 h-3.5 text-blue-500" />
                            Sent
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
