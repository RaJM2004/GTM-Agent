import { useState, useEffect } from 'react';
import { Search, CheckCircle2, Settings, Link2, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

const initialIntegrations = [
  { id: 'twilio', name: 'Twilio', category: 'Communications', desc: 'SMS and Voice infrastructure', status: 'available', logo: 'https://www.vectorlogo.zone/logos/twilio/twilio-icon.svg' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Channels', desc: 'Automate LinkedIn outreach', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png' },
  { id: 'gmail', name: 'Google Workspace / Gmail', category: 'Channels', desc: 'Send and receive emails', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' },
  { id: 'outlook', name: 'Microsoft Outlook', category: 'Channels', desc: 'Connect your Office 365 / Outlook account', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg' },
  { id: 'smtp', name: 'Custom SMTP', category: 'Channels', desc: 'Connect any email provider via SMTP credentials', status: 'available', logo: 'https://cdn-icons-png.flaticon.com/512/2950/2950689.png' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Channels', desc: 'WhatsApp API integration', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
];

export default function Integrations() {
  const { user, checkSession } = useAuth();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [showEmailModal, setShowEmailModal] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ host: '', port: '', email: '', password: '' });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [twilioForm, setTwilioForm] = useState({ account_sid: '', auth_token: '', from_number: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waQrData, setWaQrData] = useState<{session_id: string, qr_code?: string} | null>(null);
  const [isWaLoading, setIsWaLoading] = useState(false);

  // 1. Handle OAuth redirects & clear query string so sticky success/error params don't persist
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      window.history.replaceState({}, document.title, window.location.pathname);
      checkSession();
    } else if (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`Integration error: ${error}`);
    }
  }, []);

  // 2. Synchronize integration cards accurately with user.integrations from MongoDB & live checks
  useEffect(() => {
    const userIntegrations = user?.integrations || {};
    setIntegrations(initialIntegrations.map(int => {
      const isConnected = !!userIntegrations[int.id];
      return {
        ...int,
        status: isConnected ? 'connected' : 'available'
      };
    }));

    // Auto-verify live WhatsApp status if user session exists
    if (user?.user_id) {
      apiFetch(`/api/whatsapp/status/user_${user.user_id}`)
        .then(res => {
          if (res?.connection_state === 'CONNECTED') {
            setIntegrations(prev => prev.map(int => int.id === 'whatsapp' ? { ...int, status: 'connected' } : int));
          } else if (res?.connection_state === 'DISCONNECTED') {
            setIntegrations(prev => prev.map(int => int.id === 'whatsapp' ? { ...int, status: 'available' } : int));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleConnect = async (id: string) => {
    if (id === 'linkedin') {
      try {
        const currentUserId = user?.user_id || "user_12345_john_doe";
        const frontendUrl = window.location.origin;
        
        // Pass the user_id and frontend_url to the backend so it can be passed through the OAuth state
        const data = await apiFetch(`/api/integrations/linkedin/login?user_id=${currentUserId}&frontend_url=${encodeURIComponent(frontendUrl)}`);
        if (data.auth_url) {
          window.location.href = data.auth_url; // Redirect to LinkedIn OAuth
        }
      } catch (err) {
        console.error("Failed to fetch LinkedIn auth URL", err);
        alert("Failed to connect to LinkedIn.");
      }
      return;
    }

    if (id === 'gmail') {
      try {
        const currentUserId = user?.user_id || "user_12345_john_doe";
        const frontendUrl = window.location.origin;
        const data = await apiFetch(`/api/integrations/google/login?user_id=${currentUserId}&frontend_url=${encodeURIComponent(frontendUrl)}`);
        if (data.auth_url) {
          window.location.href = data.auth_url; // Redirect directly to Google Workspace login
        }
      } catch (err) {
        console.error("Failed to fetch Google Workspace auth URL", err);
        alert("Failed to connect to Google Workspace.");
      }
      return;
    }

    if (['outlook', 'smtp'].includes(id)) {
      setEmailError(null);
      setShowEmailModal(id);
      return;
    }

    if (id === 'twilio') {
      setShowTwilioModal(true);
      return;
    }

    if (id === 'whatsapp') {
      setShowWaModal(true);
      startWaSession();
      return;
    }

    // Mock connection for others
    setIntegrations(prev => prev.map(int => 
      int.id === id ? { ...int, status: 'connected' } : int
    ));
    alert(`Successfully connected ${id}!`);
  };

  const submitEmailConnect = async () => {
    setIsConnecting(true);
    setEmailError(null);
    try {
      const data = await apiFetch('/api/integrations/email/connect', {
        method: 'POST',
        bodyData: {
          provider: showEmailModal,
          user_id: user?.user_id,
          ...emailForm
        }
      });
      if (data.status === 'success' || data.success) {
        await checkSession();
        setIntegrations(prev => prev.map(int => int.id === showEmailModal ? { ...int, status: 'connected' } : int));
        setShowEmailModal(null);
        setEmailForm({ host: '', port: '', email: '', password: '' });
        alert(data.message || 'Successfully connected! Credentials verified.');
      } else {
        setEmailError(data.message || 'Failed to connect email provider');
      }
    } catch (err: any) {
      console.error(err);
      setEmailError(err.message || 'Verification failed. Please check host, port, email, and password.');
    } finally {
      setIsConnecting(false);
    }
  };

  const submitTwilioConnect = async () => {
    setIsConnecting(true);
    try {
      const data = await apiFetch('/api/integrations/twilio/connect', {
        method: 'POST',
        bodyData: {
          user_id: user?.user_id,
          ...twilioForm
        }
      });
      if (data.status === 'success' || data.success) {
        await checkSession();
        setIntegrations(prev => prev.map(int => int.id === 'twilio' ? { ...int, status: 'connected' } : int));
        setShowTwilioModal(false);
        setTwilioForm({ account_sid: '', auth_token: '', from_number: '' });
        alert(`Successfully connected Twilio! You can now send SMS Campaigns.`);
      } else {
        alert(data.message || 'Failed to connect');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Network error connecting Twilio');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/api/integrations/verify', {
        method: 'POST',
        bodyData: {
          provider: providerId,
          user_id: user?.user_id
        }
      });
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Connection verified!' : 'Connection check failed.')
      });
      if (!res.success) {
        setIntegrations(prev => prev.map(int => int.id === providerId ? { ...int, status: 'error' } : int));
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection check failed. Server unreachable.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    setIsDisconnecting(true);
    try {
      const data = await apiFetch('/api/integrations/disconnect', {
        method: 'POST',
        bodyData: { 
          provider: providerId,
          user_id: user?.user_id
        }
      });
      if (data.status === 'success' || data.success) {
        await checkSession();
        setIntegrations(prev => prev.map(int => int.id === providerId ? { ...int, status: 'available' } : int));
        setShowConfigModal(null);
        setTestResult(null);
        alert(`Successfully disconnected ${providerId}!`);
      } else {
        alert(data.message || 'Failed to disconnect');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Network error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const startWaSession = async () => {
    setIsWaLoading(true);
    setWaQrData(null);
    try {
      const data = await apiFetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      if (data.session_id) {
        setWaQrData({
          session_id: data.session_id,
          qr_code: data.data?.qr || null 
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Network error connecting WhatsApp');
      setShowWaModal(false);
    }
    setIsWaLoading(false);
  };

  useEffect(() => {
    let interval: any;
    if (showWaModal && waQrData?.session_id) {
      interval = setInterval(async () => {
        try {
          const data = await apiFetch(`/api/whatsapp/status/${waQrData.session_id}`);
          if (data.connection_state === 'CONNECTED') {
            setIntegrations(prev => prev.map(int => int.id === 'whatsapp' ? { ...int, status: 'connected' } : int));
            setShowWaModal(false);
            await checkSession();
            alert('Successfully connected WhatsApp!');
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [showWaModal, waQrData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h1>
          <p className="text-sm text-gray-500">Connect Genquantaa with your email channels, SMS providers, and external tools.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary shadow-sm outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 pb-4 overflow-x-auto hide-scrollbar">
        {['All', 'Channels', 'Communications'].map((category, i) => (
          <button key={i} className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors border shadow-sm ${
            i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-[#F2DED6] hover:text-gray-900 hover:bg-gray-50'
          }`}>
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white hover:shadow-md transition-shadow rounded-xl p-6 border border-[#F2DED6] shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center p-2 border border-gray-100 shadow-sm">
                <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${integration.logo})` }} />
              </div>
              {integration.status === 'connected' ? (
                <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Connected
                </span>
              ) : integration.status === 'error' ? (
                <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Needs Reconnect
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                  Available
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{integration.name}</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">{integration.desc}</p>
            
            <div className="pt-4 border-t border-[#F2DED6] flex gap-2">
              {integration.status === 'connected' || integration.status === 'error' ? (
                <div className="w-full space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setTestResult(null);
                        setShowConfigModal(integration.id);
                      }}
                      className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <Settings className="w-4 h-4 mr-2 text-gray-500" />
                      {integration.status === 'error' ? 'Fix Connection' : 'Configure'}
                    </button>
                    <button 
                      onClick={() => handleTestConnection(integration.id)}
                      title="Quick Health Test"
                      className="p-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  {integration.id === 'linkedin' && (
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg mt-2">
                      <p className="text-xs text-gray-500 font-mono break-all">
                        <span className="font-semibold text-gray-700">User:</span> {user?.email || user?.user_id}<br />
                        <span className="font-semibold text-gray-700">Token:</span> Active
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => handleConnect(integration.id)} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm">
                  <Link2 className="w-4 h-4 mr-2" /> Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Email Connect Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1 text-gray-900">
              Connect {integrations.find(i => i.id === showEmailModal)?.name}
            </h2>
            <p className="text-xs text-gray-500 mb-4">Credentials will be validated immediately before saving to ensure active deliverability.</p>
            
            {emailError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">{emailError}</div>
              </div>
            )}

            <div className="space-y-4">
              {showEmailModal === 'smtp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">SMTP Host</label>
                    <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={emailForm.host} onChange={e => setEmailForm({...emailForm, host: e.target.value})} placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">SMTP Port</label>
                    <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={emailForm.port} onChange={e => setEmailForm({...emailForm, port: e.target.value})} placeholder="587" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                <input type="email" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={emailForm.email} onChange={e => setEmailForm({...emailForm, email: e.target.value})} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">App Password / Password</label>
                <input type="password" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" value={emailForm.password} onChange={e => setEmailForm({...emailForm, password: e.target.value})} placeholder="Enter secure app password" />
                <p className="text-xs text-gray-500 mt-2">
                  {showEmailModal === 'outlook' 
                    ? "For Microsoft 365 / Outlook, please generate an App Password or ensure SMTP AUTH is permitted for this account."
                    : "For Gmail/Google accounts, you must use a 16-character App Password (myaccount.google.com/apppasswords), or use the Google Workspace button to authenticate with OAuth."
                  }
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => { setShowEmailModal(null); setEmailError(null); }} className="px-4 py-2 border border-[#F2DED6] hover:bg-gray-50 rounded-lg text-gray-600 font-medium transition-colors">Cancel</button>
              <button onClick={submitEmailConnect} disabled={isConnecting || !emailForm.email || !emailForm.password} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors shadow-sm">
                 {isConnecting ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Verifying & Connecting...
                   </>
                 ) : 'Verify & Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Twilio Connect Modal */}
      {showTwilioModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Connect Twilio</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Account SID</label>
                <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-mono" value={twilioForm.account_sid} onChange={e => setTwilioForm({...twilioForm, account_sid: e.target.value})} placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Auth Token</label>
                <input type="password" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-mono" value={twilioForm.auth_token} onChange={e => setTwilioForm({...twilioForm, auth_token: e.target.value})} placeholder="your_auth_token" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">From Phone Number</label>
                <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-mono" value={twilioForm.from_number} onChange={e => setTwilioForm({...twilioForm, from_number: e.target.value})} placeholder="+1234567890" />
                <p className="text-xs text-gray-500 mt-2">Enter your Twilio phone number in E.164 format (e.g., +1234567890).</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowTwilioModal(false)} className="px-4 py-2 border border-[#F2DED6] hover:bg-gray-50 rounded-lg text-gray-600 font-medium transition-colors">Cancel</button>
              <button onClick={submitTwilioConnect} disabled={isConnecting || !twilioForm.account_sid || !twilioForm.auth_token || !twilioForm.from_number} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors shadow-sm">
                 {isConnecting ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Saving...
                   </>
                 ) : 'Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Connect WhatsApp</h2>
            <p className="text-sm text-gray-500 mb-6">Scan the QR code below with your WhatsApp mobile app to connect your account.</p>
            
            <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl mb-6">
              {isWaLoading ? (
                <div className="flex flex-col items-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                  Generating QR Code...
                </div>
              ) : waQrData?.qr_code ? (
                <img src={waQrData.qr_code} alt="WhatsApp QR Code" className="max-w-[200px] max-h-[200px]" />
              ) : (
                <div className="text-gray-400">
                  <p>Check terminal logs if QR doesn't appear.</p>
                  <p className="text-xs mt-1">(Depends on OpenWA config)</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowWaModal(false)} className="px-4 py-2 border border-[#F2DED6] hover:bg-gray-50 rounded-lg text-gray-600 font-medium transition-colors w-full">Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Configuration & Diagnostic Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <button 
              onClick={() => {
                setShowConfigModal(null);
                setTestResult(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configure {integrations.find(i => i.id === showConfigModal)?.name}
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-[#FAF9F6] border border-[#F2DED6] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Account</p>
                    <p className="text-sm text-gray-800 font-medium font-mono mt-1 truncate max-w-[200px]">
                      {user?.integrations?.[showConfigModal]?.email || user?.integrations?.[showConfigModal]?.from_number || (showConfigModal === 'whatsapp' ? 'WhatsApp Paired' : 'OAuth Account')}
                    </p>
                  </div>
                  <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                  </span>
                </div>

                {showConfigModal === 'twilio' && (
                  <div className="p-4 bg-[#FAF9F6] border border-[#F2DED6] rounded-xl text-sm text-gray-700 space-y-2 font-mono">
                    <p><span className="font-semibold">Account SID:</span> {user?.integrations?.twilio?.account_sid}</p>
                    <p><span className="font-semibold">From Number:</span> {user?.integrations?.twilio?.from_number}</p>
                  </div>
                )}

                {/* Live Test Connection Card */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Health & Delivery Test</p>
                      <p className="text-xs text-gray-500">Verify your credentials and connection with provider.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(showConfigModal)}
                      disabled={isTestingConnection}
                      className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isTestingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Test Live
                    </button>
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                      testResult.success 
                        ? 'bg-green-50 text-green-800 border-green-200' 
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 leading-relaxed">
                        <span className="font-semibold">{testResult.success ? 'Verified:' : 'Error:'}</span> {testResult.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {showConfigModal === 'twilio' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTwilioForm({
                        account_sid: user?.integrations?.twilio?.account_sid || '',
                        auth_token: user?.integrations?.twilio?.auth_token || '',
                        from_number: user?.integrations?.twilio?.from_number || ''
                      });
                      setShowConfigModal(null);
                      setShowTwilioModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors mr-auto"
                  >
                    Edit Credentials
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowConfigModal(null);
                    setTestResult(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect(showConfigModal)}
                  disabled={isDisconnecting}
                  className="flex items-center px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
