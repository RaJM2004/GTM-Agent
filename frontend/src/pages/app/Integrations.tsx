import { useState, useEffect } from 'react';
import { Search, CheckCircle2, Settings, Link2, ExternalLink, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const initialIntegrations = [
  { id: 'openai', name: 'OpenAI', category: 'AI Models', desc: 'Power your agents with GPT-4', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg' },
  { id: 'gemini', name: 'Google Gemini', category: 'AI Models', desc: 'Use Gemini Pro for advanced reasoning', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg' },
  { id: 'twilio', name: 'Twilio', category: 'Communications', desc: 'SMS and Voice infrastructure', status: 'connected', logo: 'https://www.vectorlogo.zone/logos/twilio/twilio-icon.svg' },
  { id: 'vapi', name: 'VAPI', category: 'Communications', desc: 'Voice AI calling infrastructure', status: 'available', logo: 'https://vapi.ai/logo.svg' },
  { id: 'apollo', name: 'Apollo.io', category: 'Data & Enrichment', desc: 'B2B contact database', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Apollo.io_logo.png/600px-Apollo.io_logo.png' },
  { id: 'hunter', name: 'Hunter.io', category: 'Data & Enrichment', desc: 'Find professional email addresses', status: 'available', logo: 'https://hunter.io/assets/logo-b94ab9668bdcc7bc0c410ca3ad1741db.svg' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Channels', desc: 'Automate LinkedIn outreach', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png' },
  { id: 'gmail', name: 'Google Workspace / Gmail', category: 'Channels', desc: 'Send and receive emails', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' },
  { id: 'outlook', name: 'Microsoft Outlook', category: 'Channels', desc: 'Connect your Office 365 / Outlook account', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg' },
  { id: 'smtp', name: 'Custom SMTP', category: 'Channels', desc: 'Connect any email provider via SMTP credentials', status: 'available', logo: 'https://cdn-icons-png.flaticon.com/512/2950/2950689.png' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Channels', desc: 'WhatsApp API integration', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { id: 'stripe', name: 'Stripe', category: 'Billing', desc: 'Payment processing', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg' },
];

export default function Integrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [showEmailModal, setShowEmailModal] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ host: '', port: '', email: '', password: '' });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (user && user.integrations) {
      setIntegrations(prev => prev.map(int => {
        if (user.integrations[int.id]) {
          return { ...int, status: 'connected' };
        }
        return int;
      }));
    }

    // Check if we just returned from LinkedIn or Gmail auth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'linkedin_connected') {
      setIntegrations(prev => prev.map(int => 
        int.id === 'linkedin' ? { ...int, status: 'connected' } : int
      ));
    }
    if (urlParams.get('success') === 'gmail_connected') {
      setIntegrations(prev => prev.map(int => 
        int.id === 'gmail' ? { ...int, status: 'connected' } : int
      ));
    }
  }, [user]);

  const handleConnect = async (id: string) => {
    if (id === 'linkedin') {
      try {
        const currentUserId = user?.user_id || "user_12345_john_doe";
        
        // Pass the user_id to the backend so it can be passed through the OAuth state
        const res = await fetch(`http://localhost:8000/api/integrations/linkedin/login?user_id=${currentUserId}`);
        const data = await res.json();
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
        const res = await fetch(`http://localhost:8000/api/integrations/google/login?user_id=${currentUserId}`);
        const data = await res.json();
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
      setShowEmailModal(id);
      return;
    }

    // Mock connection for others
    setIntegrations(integrations.map(int => 
      int.id === id ? { ...int, status: 'connected' } : int
    ));
    alert(`Successfully connected ${id}!`);
  };

  const submitEmailConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('http://localhost:8000/api/integrations/email/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: showEmailModal,
          user_id: user?.user_id || 'user_12345_john_doe',
          ...emailForm
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIntegrations(integrations.map(int => int.id === showEmailModal ? { ...int, status: 'connected' } : int));
        setShowEmailModal(null);
        setEmailForm({ host: '', port: '', email: '', password: '' });
        alert(`Successfully connected! You can now send Email Campaigns directly from the platform.`);
      } else {
        alert(data.detail || 'Failed to connect');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting email provider');
    }
    setIsConnecting(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h1>
          <p className="text-sm text-gray-500">Connect Genquantaa with your favorite tools and platforms.</p>
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
        {['All', 'AI Models', 'Communications', 'Data & Enrichment', 'Channels', 'Billing'].map((category, i) => (
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
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                  Available
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{integration.name}</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">{integration.desc}</p>
            
            <div className="pt-4 border-t border-[#F2DED6] flex gap-2">
              {integration.status === 'connected' ? (
                <div className="w-full space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowConfigModal(integration.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <Settings className="w-4 h-4 mr-2" /> Configure
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  {integration.id === 'linkedin' && (
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg mt-2">
                      <p className="text-xs text-gray-500 font-mono break-all">
                        <span className="font-semibold text-gray-700">User ID:</span> {user?.user_id || 'user_12345_john_doe'}<br />
                        <span className="font-semibold text-gray-700">Token:</span> Valid & Active
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

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Connect {integrations.find(i => i.id === showEmailModal)?.name}
            </h2>
            <div className="space-y-4">
              {showEmailModal === 'smtp' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">SMTP Host</label>
                    <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary" value={emailForm.host} onChange={e => setEmailForm({...emailForm, host: e.target.value})} placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SMTP Port</label>
                    <input type="text" className="w-full border border-[#F2DED6] rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary" value={emailForm.port} onChange={e => setEmailForm({...emailForm, port: e.target.value})} placeholder="587" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input type="email" className="w-full border border-[#F2DED6] rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary" value={emailForm.email} onChange={e => setEmailForm({...emailForm, email: e.target.value})} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Password / Password</label>
                <input type="password" className="w-full border border-[#F2DED6] rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary" value={emailForm.password} onChange={e => setEmailForm({...emailForm, password: e.target.value})} placeholder="Enter your secure password" />
                {showEmailModal !== 'smtp' && (
                  <p className="text-xs text-gray-500 mt-2">For enhanced security, we recommend using an App Password generated from your provider's security settings rather than your primary account password.</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowEmailModal(null)} className="px-4 py-2 border border-[#F2DED6] hover:bg-gray-50 rounded-lg text-gray-600 font-medium transition-colors">Cancel</button>
              <button onClick={submitEmailConnect} disabled={isConnecting || !emailForm.email || !emailForm.password} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors">
                 {isConnecting ? 'Connecting...' : 'Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <button 
              onClick={() => setShowConfigModal(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configure Connection
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-[#FAF9F6] border border-[#F2DED6] rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Connected Account</p>
                    <p className="text-sm text-gray-500 font-mono mt-1 truncate max-w-[200px]">
                      {user?.integrations?.[showConfigModal]?.email || 'Connected via OAuth'}
                    </p>
                  </div>
                  <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDisconnecting(true);
                    try {
                      const res = await fetch(`http://localhost:8000/api/integrations/disconnect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          provider: showConfigModal,
                          user_id: user?.user_id || 'user_12345_john_doe'
                        })
                      });
                      if (res.ok) {
                        setIntegrations(integrations.map(int => int.id === showConfigModal ? { ...int, status: 'available' } : int));
                        setShowConfigModal(null);
                        alert(`Successfully disconnected!`);
                      } else {
                        alert('Failed to disconnect');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Network error');
                    }
                    setIsDisconnecting(false);
                  }}
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
