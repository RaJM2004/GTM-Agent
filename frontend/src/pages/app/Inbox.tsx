import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Mail, 
  Filter, 
  Star, 
  Clock, 
  MoreVertical, 
  Reply, 
  Send, 
  Paperclip, 
  Loader2, 
  AlertTriangle, 
  Plug,
  Inbox as InboxIcon,
  RefreshCw
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function Inbox() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('All');
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/integrations/email/messages?folder=${folder}`);
      
      if (res.success) {
        setConnected(res.connected);
        const emailThreads = res.emails || [];
        setThreads(emailThreads);
        if (emailThreads.length > 0) {
          setSelectedThread(emailThreads[0]);
        } else {
          setSelectedThread(null);
        }
      } else {
        setConnected(true); // Visually they attached, but fetching failed
        setError(res.message || 'Credentials/Verification failed');
        setThreads([]);
        setSelectedThread(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [folder]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    setIsSending(true);
    // Mock sending for UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`Reply sent to ${selectedThread.name}!`);
    setReplyText('');
    setIsSending(false);
  };

  // Filter threads based on Search and Tabs
  const filteredThreads = threads.filter(thread => {
    const matchesSearch = 
      thread.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (activeTab === 'Unread') return thread.unread;
    if (activeTab === 'Emails') return thread.channel === 'email';
    // Channels like linkedin/calls will not have items if email integration is the only provider
    if (activeTab === 'LinkedIn') return thread.channel === 'linkedin';
    if (activeTab === 'Calls') return thread.channel === 'call';
    
    return true;
  });

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#F2DED6] bg-white flex justify-between items-center z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Unified Inbox</h1>
          <p className="text-sm text-gray-500">Manage your connected outreach channels in real-time.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchInbox} 
            disabled={loading}
            className="p-2 bg-white border border-[#F2DED6] text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF9F6] gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-gray-500 font-medium animate-pulse">Fetching real-time messages...</span>
        </div>
      ) : !connected ? (
        // Not Attached State
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF9F6] p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white border border-[#F2DED6] flex items-center justify-center shadow-md mb-6 relative">
            <Mail className="w-10 h-10 text-primary" />
            <Plug className="w-5 h-5 text-gray-400 absolute bottom-3 right-3 bg-white rounded-full p-0.5 border" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Email Account</h2>
          <p className="text-gray-600 max-w-md mb-8 leading-relaxed">
            Hey <span className="font-semibold text-gray-800">{user?.name || 'Raj Mange'}</span>, you haven't connected an email inbox yet. Link your Google Workspace, Microsoft Outlook, or Custom SMTP/IMAP server to view and reply to emails here in real-time.
          </p>
          <Link 
            to="/app/integrations" 
            className="flex items-center gap-2 px-6 py-3 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Connect Email in Integrations
          </Link>
        </div>
      ) : (
        // Connected State
        <div className="flex flex-1 overflow-hidden bg-[#FAF9F6]">
          
          {/* Left Panel: Thread List */}
          <div className="w-full md:w-[350px] lg:w-[400px] border-r border-[#F2DED6] bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-[#F2DED6] space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FDF8F5] border border-[#F2DED6] rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              {/* Filters & Folders */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar items-center">
                <div className="flex bg-[#FDF8F5] border border-[#F2DED6] rounded-lg p-0.5 mr-2">
                  <button
                    onClick={() => setFolder('inbox')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      folder === 'inbox' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Inbox
                  </button>
                  <button
                    onClick={() => setFolder('sent')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      folder === 'sent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sent
                  </button>
                </div>
                {['All', 'Unread', 'Emails', 'LinkedIn', 'Calls'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                      activeTab === tab 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-[#F2DED6] hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-2.5 text-xs text-red-800 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {error} <br/>
                  <Link to="/app/integrations" className="underline text-primary font-bold">Check Credentials</Link>
                </div>
              </div>
            )}

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <InboxIcon className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-sm font-medium">No messages found</p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <div 
                    key={thread.id} 
                    onClick={() => setSelectedThread(thread)}
                    className={`p-4 border-b border-[#F2DED6]/50 cursor-pointer hover:bg-[#FDF8F5] transition-colors relative ${selectedThread?.id === thread.id ? 'bg-[#FDF8F5]' : ''}`}
                  >
                    {selectedThread?.id === thread.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-blue-50 text-blue-500">
                          <Mail className="w-3.5 h-3.5" />
                        </span>
                        <span className={`font-semibold text-sm truncate max-w-[150px] ${thread.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {thread.name}
                        </span>
                      </div>
                      <span className={`text-[10px] shrink-0 ${thread.unread ? 'text-primary font-bold' : 'text-gray-400'}`}>
                        {thread.time}
                      </span>
                    </div>
                    <div className="pl-8">
                      <p className="text-xs font-semibold text-gray-900 mb-0.5 truncate">{thread.subject}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{thread.preview}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Message View */}
          <div className="hidden md:flex flex-1 flex-col bg-white">
            {selectedThread ? (
              <>
                {/* Message Header */}
                <div className="p-6 border-b border-[#F2DED6] flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold border border-primary/20 shrink-0">
                      {selectedThread.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedThread.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{selectedThread.company}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          Email Message
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-gray-400">
                    <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><Star className="w-5 h-5" /></button>
                    <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><Clock className="w-5 h-5" /></button>
                    <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6]/30">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 border-gray-100">{selectedThread.subject}</h3>
                    
                    <div className="bg-[#FDF8F5] border border-[#F2DED6]/50 rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#F2DED6]/30">
                        <span className="text-sm font-semibold text-gray-800">{selectedThread.name}</span>
                        <span className="text-xs text-gray-500">{selectedThread.time}</span>
                      </div>
                      <div 
                        className="text-sm text-gray-700 leading-relaxed font-sans prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedThread.body || selectedThread.preview }}
                      />
                    </div>
                  </div>
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-[#F2DED6] bg-[#f8f9fa]">
                  <div className="max-w-3xl mx-auto">
                    <div className="bg-white border border-[#F2DED6] rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                      <textarea 
                        rows={4} 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${selectedThread.name}...`}
                        className="w-full p-4 text-sm text-gray-900 placeholder-gray-400 border-none outline-none resize-none"
                      ></textarea>
                      <div className="flex justify-between items-center p-3 bg-gray-50 border-t border-[#F2DED6]">
                        <div className="flex gap-1">
                          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
                          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"><Reply className="w-4 h-4" /></button>
                        </div>
                        <button 
                          onClick={handleSendReply}
                          disabled={isSending || !replyText.trim()}
                          className="flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                            </>
                          ) : (
                            <>
                              Send Reply <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                <InboxIcon className="w-12 h-12 stroke-1" />
                <p className="text-sm font-semibold">Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
