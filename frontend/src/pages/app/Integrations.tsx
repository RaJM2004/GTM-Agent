import { useState, useEffect } from 'react';
import { Search, CheckCircle2, Settings, Link2, ExternalLink } from 'lucide-react';

const initialIntegrations = [
  { id: 'openai', name: 'OpenAI', category: 'AI Models', desc: 'Power your agents with GPT-4', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg' },
  { id: 'gemini', name: 'Google Gemini', category: 'AI Models', desc: 'Use Gemini Pro for advanced reasoning', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg' },
  { id: 'twilio', name: 'Twilio', category: 'Communications', desc: 'SMS and Voice infrastructure', status: 'connected', logo: 'https://www.vectorlogo.zone/logos/twilio/twilio-icon.svg' },
  { id: 'vapi', name: 'VAPI', category: 'Communications', desc: 'Voice AI calling infrastructure', status: 'available', logo: 'https://vapi.ai/logo.svg' },
  { id: 'apollo', name: 'Apollo.io', category: 'Data & Enrichment', desc: 'B2B contact database', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Apollo.io_logo.png/600px-Apollo.io_logo.png' },
  { id: 'hunter', name: 'Hunter.io', category: 'Data & Enrichment', desc: 'Find professional email addresses', status: 'available', logo: 'https://hunter.io/assets/logo-b94ab9668bdcc7bc0c410ca3ad1741db.svg' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Channels', desc: 'Automate LinkedIn outreach', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png' },
  { id: 'gmail', name: 'Gmail', category: 'Channels', desc: 'Send and receive emails', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' },
  { id: 'outlook', name: 'Outlook', category: 'Channels', desc: 'Microsoft Outlook integration', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Channels', desc: 'WhatsApp API integration', status: 'available', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
  { id: 'stripe', name: 'Stripe', category: 'Billing', desc: 'Payment processing', status: 'connected', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg' },
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  useEffect(() => {
    // Check if we just returned from LinkedIn auth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'linkedin_connected') {
      setIntegrations(prev => prev.map(int => 
        int.id === 'linkedin' ? { ...int, status: 'connected' } : int
      ));
    }
  }, []);

  const handleConnect = async (id: string) => {
    if (id === 'linkedin') {
      try {
        // In a real app, you would get the user_id from your authentication state (e.g. JWT token or Redux store)
        const currentUserId = "user_12345_john_doe";
        
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

    // Mock connection for others
    setIntegrations(integrations.map(int => 
      int.id === id ? { ...int, status: 'connected' } : int
    ));
    alert(`Successfully connected ${id}!`);
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
                    <button className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <Settings className="w-4 h-4 mr-2" /> Configure
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-[#F2DED6] rounded-lg transition-colors shadow-sm">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  {integration.id === 'linkedin' && (
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg mt-2">
                      <p className="text-xs text-gray-500 font-mono break-all">
                        <span className="font-semibold text-gray-700">User ID:</span> user_12345_john_doe<br />
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
    </div>
  );
}
