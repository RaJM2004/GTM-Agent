import { useState, useEffect } from 'react';
import {
  Bot,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Save,
  Send,
  Plus,
  X,
  Volume2,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Power,
  ShieldCheck,
  Sparkles,
  UserCheck,
  MessageSquare,
  MessageCircle,
  FileText,
  Copy,
  Trash2,
  Edit2,
  QrCode,
  LogOut,
  Tag,
  ArrowRight,
  Phone,
  Layers,
  Search
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import WhatsAppTemplateManager, { type WhatsAppTemplate } from '../../components/WhatsAppTemplateManager';

export default function WhatsAppBot() {
  const [activeTab, setActiveTab] = useState<'hub' | 'editor' | 'sessions'>('hub');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED');
  const [connectedNumber, setConnectedNumber] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isBotEnabled, setIsBotEnabled] = useState<boolean>(true);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MARKETING' | 'UTILITY'>('ALL');

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Test Dispatch By ID Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [targetTemplateForDispatch, setTargetTemplateForDispatch] = useState<WhatsAppTemplate | null>(null);
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchConnectionStatus(),
        fetchTemplates(),
        fetchSessions()
      ]);
    } catch (err) {
      console.error('Error loading WhatsApp bot data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const data = await apiFetch('/api/whatsapp-bot/config');
      if (data.status === 'success') {
        setConnectionStatus(data.whatsapp_status || (data.whatsapp_connected ? 'CONNECTED' : 'DISCONNECTED'));
        setSessionId(data.session_id || '');
        if (data.config) {
          setIsBotEnabled(data.config.is_enabled ?? true);
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp bot connection status:', err);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await apiFetch('/api/whatsapp-bot/templates');
      if (data.status === 'success' && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await apiFetch('/api/whatsapp-bot/sessions');
      if (data.status === 'success') {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Master Bot Toggle
  const handleToggleMasterBot = async () => {
    const nextState = !isBotEnabled;
    setIsBotEnabled(nextState);
    try {
      await apiFetch('/api/whatsapp-bot/toggle', {
        method: 'POST',
        bodyData: { is_enabled: nextState }
      });
    } catch (err) {
      console.error('Failed to toggle master bot:', err);
      setIsBotEnabled(!nextState);
    }
  };

  // Toggle Single Template Bot Active/Paused
  const handleToggleTemplate = async (templateId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setTemplates(prev =>
      prev.map(t => (t.id === templateId || t._id === templateId ? { ...t, is_active: nextActive } : t))
    );
    try {
      await apiFetch(`/api/whatsapp-bot/templates/${templateId}/toggle`, {
        method: 'POST',
        bodyData: { is_active: nextActive }
      });
    } catch (err) {
      console.error('Failed to toggle template:', err);
      setTemplates(prev =>
        prev.map(t => (t.id === templateId || t._id === templateId ? { ...t, is_active: currentActive } : t))
      );
    }
  };

  // Connect WhatsApp / Open QR Modal
  const handleOpenQrConnect = async () => {
    setShowQrModal(true);
    setQrLoading(true);
    setQrCodeData(null);
    try {
      const res = await apiFetch('/api/whatsapp/connect', { method: 'POST' });
      if (res.status === 'success') {
        if (res.data?.qr) {
          setQrCodeData(res.data.qr);
        } else if (res.data?.state === 'CONNECTED') {
          setConnectionStatus('CONNECTED');
          setShowQrModal(false);
          alert('WhatsApp is already connected!');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to start WhatsApp session:', err);
    } finally {
      setQrLoading(false);
    }

    // Auto-poll connection status while modal is open
    const pollInterval = setInterval(async () => {
      try {
        const check = await apiFetch('/api/whatsapp-bot/config');
        if (check.whatsapp_status === 'CONNECTED' || check.whatsapp_connected) {
          setConnectionStatus('CONNECTED');
          setShowQrModal(false);
          clearInterval(pollInterval);
          alert('WhatsApp connected successfully!');
        }
      } catch (e) {}
    }, 2500);

    // Stop polling after 90s
    setTimeout(() => clearInterval(pollInterval), 90000);
  };

  // Delete Template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template bot?')) return;
    try {
      await apiFetch(`/api/whatsapp-bot/templates/${templateId}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Copy Template ID to Clipboard
  const handleCopyId = (tmplId: string) => {
    navigator.clipboard.writeText(tmplId);
    setCopiedId(tmplId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Dispatch Modal
  const handleOpenDispatch = (tmpl: WhatsAppTemplate) => {
    setTargetTemplateForDispatch(tmpl);
    setDispatchPhone('');
    setDispatchSuccess(false);
    setShowDispatchModal(true);
  };

  // Execute Dispatch By ID
  const handleExecuteDispatch = async () => {
    if (!targetTemplateForDispatch || !dispatchPhone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }
    setDispatching(true);
    try {
      const res = await apiFetch('/api/whatsapp-bot/templates/send-by-id', {
        method: 'POST',
        bodyData: {
          template_id: targetTemplateForDispatch.id || targetTemplateForDispatch.name,
          phone_number: dispatchPhone.trim()
        }
      });
      if (res.status === 'success') {
        setDispatchSuccess(true);
        setTimeout(() => {
          setShowDispatchModal(false);
          setDispatchSuccess(false);
        }, 2000);
        fetchSessions();
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      alert('Failed to dispatch template. Please check phone number and connection status.');
    } finally {
      setDispatching(false);
    }
  };

  // Filtered Templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.trigger_keywords && t.trigger_keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeBotsCount = templates.filter(t => t.is_active !== false).length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── TOP COMMAND HEADER: Live WhatsApp Connection & Multi-Bot Master Controls ── */}
      <div className="bg-white p-5 rounded-2xl border border-[#F2DED6] shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                WhatsApp Multi-Bot Command Center
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  Simultaneous Multi-Bot Routing
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Run multiple promotional, service, and lead qualification bots simultaneously on the same WhatsApp number.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Direct Connection & Master Switch */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* WhatsApp Status Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold bg-[#FAF9F6] border-[#F2DED6] shadow-2xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {connectionStatus === 'CONNECTED' ? (
                <span className="text-emerald-700 font-bold">WhatsApp Online</span>
              ) : (
                <span className="text-amber-700">WhatsApp Offline</span>
              )}
            </span>

            {/* Quick Action inside Pill */}
            {connectionStatus !== 'CONNECTED' ? (
              <button
                onClick={handleOpenQrConnect}
                className="ml-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
              >
                Scan QR Code <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleOpenQrConnect}
                className="ml-1 text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                title="View Connection or Re-scan QR"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Master Bot Active Toggle */}
          <button
            onClick={handleToggleMasterBot}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all border shadow-sm ${
              isBotEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isBotEnabled ? 'All Bots Active' : 'All Bots Paused'}
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#F2DED6] gap-2 sm:gap-4 overflow-x-auto pb-0.5">
        <button
          onClick={() => {
            setActiveTab('hub');
            setEditingTemplate(null);
            fetchTemplates();
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'hub'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Active Templates & Multi-Bot Hub ({templates.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('editor');
            setEditingTemplate(null);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'editor'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          {editingTemplate ? `Editing: ${editingTemplate.name}` : 'Create New Template Bot'}
        </button>

        <button
          onClick={() => {
            setActiveTab('sessions');
            fetchSessions();
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sessions'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Active Conversations ({sessions.length})
        </button>
      </div>

      {/* ── TAB 1: ACTIVE TEMPLATES & MULTI-BOT HUB (MAIN DASHBOARD) ────────── */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm">
              <span className="text-xs font-medium text-gray-500">Total Configured Templates</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{templates.length}</div>
              <span className="text-[11px] text-gray-400">Meta-compliant templates</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm">
              <span className="text-xs font-medium text-gray-500">Simultaneously Active Bots</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{activeBotsCount} Active</div>
              <span className="text-[11px] text-emerald-600 font-medium">Running on same WhatsApp number</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm">
              <span className="text-xs font-medium text-gray-500">Handled Conversations</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{sessions.length}</div>
              <span className="text-[11px] text-gray-400">Automated lead qualification chats</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm flex flex-col justify-between">
              <span className="text-xs font-medium text-gray-500">Multi-Bot Engine</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-gray-900">Keyword & ID Auto-Router</span>
              </div>
              <span className="text-[11px] text-gray-400">Directly callable by Template ID</span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by template name, ID, or trigger keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter & New Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                {(['ALL', 'MARKETING', 'UTILITY'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      selectedCategory === cat ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setActiveTab('editor');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Template Bot
              </button>
            </div>
          </div>

          {/* Grid of Multi-Bot Templates */}
          {filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#F2DED6] shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">No WhatsApp Template Bots Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Create your first template bot to start promoting products, answering queries, and qualifying leads on your WhatsApp number simultaneously.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setActiveTab('editor');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Your First Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(tmpl => {
                const tmplId = tmpl.id || tmpl._id || tmpl.name;
                const isTemplateActive = tmpl.is_active !== false;

                return (
                  <div
                    key={tmplId}
                    className="bg-white rounded-2xl border border-[#F2DED6] hover:border-emerald-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-5 space-y-3.5 flex-1">
                      {/* Top Row: Category + Language + Active Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {tmpl.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-gray-100 text-gray-600">
                            {tmpl.language || 'English'}
                          </span>
                        </div>

                        {/* Individual Bot Active Switch */}
                        <button
                          onClick={() => handleToggleTemplate(tmplId, isTemplateActive)}
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all border ${
                            isTemplateActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-gray-100 text-gray-500 border-gray-300'
                          }`}
                          title="Toggle this template bot on/off"
                        >
                          <span className={`w-2 h-2 rounded-full ${isTemplateActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {isTemplateActive ? 'Bot Active' : 'Paused'}
                        </button>
                      </div>

                      {/* Template Name & ID Badge */}
                      <div>
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                          {tmpl.name}
                        </h3>

                        {/* Prominent Template ID Callout (Requested by user) */}
                        <div className="mt-1 flex items-center gap-1.5 bg-[#FAF9F6] px-2.5 py-1 rounded-lg border border-[#F2DED6] text-[11px] font-mono text-gray-700">
                          <span className="text-gray-400 font-sans">ID:</span>
                          <span className="font-bold truncate flex-1">{tmplId}</span>
                          <button
                            onClick={() => handleCopyId(tmplId)}
                            className="p-1 hover:text-emerald-700 rounded transition-colors text-gray-500"
                            title="Copy Template ID to clipboard"
                          >
                            {copiedId === tmplId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Multi-Bot Trigger Keywords */}
                      <div className="space-y-1 pt-1 border-t border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Inbound Trigger Keywords:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(tmpl.trigger_keywords && tmpl.trigger_keywords.length > 0
                            ? tmpl.trigger_keywords
                            : ['auto', tmpl.name.split('_')[0]]
                          ).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Body Snippet */}
                      <div className="text-xs text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/80 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {tmpl.body}
                      </div>

                      {/* Buttons Preview */}
                      {tmpl.buttons && tmpl.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tmpl.buttons.map((b, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white border border-gray-200 text-[#0C8CE9] font-semibold flex items-center gap-1 shadow-2xs"
                            >
                              {b.type === 'PHONE_NUMBER' && <Phone className="w-2.5 h-2.5" />}
                              {b.type === 'URL' && <ExternalLink className="w-2.5 h-2.5" />}
                              {b.type === 'QUICK_REPLY' && <MessageSquare className="w-2.5 h-2.5" />}
                              {b.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Bottom Strip */}
                    <div className="bg-[#FAF9F6] px-5 py-3 border-t border-[#F2DED6] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenDispatch(tmpl)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <Send className="w-3 h-3" /> Test Call (By ID)
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTemplate(tmpl);
                            setActiveTab('editor');
                          }}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"
                          title="Edit Template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmplId)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CREATE / EDIT TEMPLATE ───────────────────────────────────── */}
      {activeTab === 'editor' && (
        <WhatsAppTemplateManager
          initialTemplate={editingTemplate}
          onSaved={() => {
            setActiveTab('hub');
            setEditingTemplate(null);
            fetchTemplates();
          }}
          onCancel={() => {
            setActiveTab('hub');
            setEditingTemplate(null);
          }}
        />
      )}

      {/* ── TAB 3: CONVERSATION SESSIONS & LOGS ─────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2DED6]">
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Bot Conversation Sessions</h3>
              <p className="text-xs text-gray-500">Live conversations handled across your multiple WhatsApp template bots</p>
            </div>
            <button
              onClick={fetchSessions}
              disabled={loadingSessions}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#F2DED6] hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin text-emerald-600' : ''}`} />
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">No active bot conversations yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                When customers message your connected WhatsApp or trigger keyword templates, their live state and bot interactions will show here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#F2DED6]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] text-gray-600 uppercase tracking-wider text-[10px] font-semibold border-b border-[#F2DED6]">
                  <tr>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Active Bot Template</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2DED6] bg-white">
                  {sessions.map(s => (
                    <tr key={s.id || s.phone_number} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">
                        +{s.phone_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {s.active_template_name || 'Inbound Welcome Bot'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 text-[11px]">
                        {s.step || 'NEW'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            s.outcome === 'Interested'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.outcome === 'Not Interested'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.outcome || 'Engaged'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {s.updated_at ? new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            await apiFetch('/api/whatsapp-bot/reset-session', {
                              method: 'POST',
                              bodyData: { phone_number: s.phone_number }
                            });
                            fetchSessions();
                            alert(`Session for ${s.phone_number} reset!`);
                          }}
                          className="text-[11px] text-gray-500 hover:text-emerald-700 font-semibold"
                        >
                          Reset Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: DIRECT WHATSAPP QR CODE CONNECT ───────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Connect WhatsApp Device</h3>
              <p className="text-xs text-gray-500 mt-1">
                Scan this QR code to connect your WhatsApp number to the Multi-Bot engine.
              </p>
            </div>

            {/* QR Display */}
            <div className="w-64 h-64 mx-auto rounded-2xl bg-[#FAF9F6] border-2 border-emerald-200 flex items-center justify-center p-2 shadow-inner">
              {qrLoading ? (
                <div className="flex flex-col items-center gap-2 text-xs text-gray-500">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  <span>Generating fresh QR code...</span>
                </div>
              ) : qrCodeData ? (
                <img
                  src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-xs text-gray-400 p-4">
                  Unable to load QR code. Click retry below.
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="text-left text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-gray-700">
              <div className="font-semibold text-gray-900">Instructions:</div>
              <div>1. Open <strong>WhatsApp</strong> on your phone.</div>
              <div>2. Tap <strong>Settings / Menu (⋮)</strong> → <strong>Linked Devices</strong>.</div>
              <div>3. Tap <strong>Link a Device</strong> and point your camera at this QR code.</div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenQrConnect}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh QR
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TEST CALL BY TEMPLATE ID (User Request) ────────────────── */}
      {showDispatchModal && targetTemplateForDispatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowDispatchModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Dispatch Template by ID</h3>
                <p className="text-xs text-gray-500">Send this template directly to any WhatsApp number</p>
              </div>
            </div>

            {/* Template Info Card */}
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#F2DED6] space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-900">{targetTemplateForDispatch.name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {targetTemplateForDispatch.category}
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                <span>Template ID:</span>
                <strong className="text-gray-800">{targetTemplateForDispatch.id || targetTemplateForDispatch.name}</strong>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Recipient Phone Number (with Country Code):</label>
              <input
                type="text"
                value={dispatchPhone}
                onChange={e => setDispatchPhone(e.target.value)}
                placeholder="e.g. 917337726482 or +1234567890"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                disabled={dispatching || !dispatchPhone.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {dispatching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : dispatchSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {dispatching ? 'Sending...' : dispatchSuccess ? 'Dispatched!' : 'Send Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
