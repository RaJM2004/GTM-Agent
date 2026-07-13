import { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Play, Pause, Search, Calendar, PhoneCall, Mail, Share2, MessageCircle, X, Loader2, Image as ImageIcon, Send, Upload, Save, ChevronDown, ChevronRight, Mic, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';


export default function Campaigns() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('linkedin');
  const [objective, setObjective] = useState('engagement');
  const [action, setAction] = useState('post');
  const [productName, setProductName] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [needsImage, setNeedsImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [imageOption, setImageOption] = useState<'none' | 'upload' | 'generate'>('none');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);

  // View Campaign State
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);
  const [industryGroups, setIndustryGroups] = useState<any[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedLeadEmails, setSelectedLeadEmails] = useState<Set<string>>(new Set());
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  const [onlyVerifiedEmails, setOnlyVerifiedEmails] = useState(false);

  // Voice Campaign State
  const [voiceRawPrompt, setVoiceRawPrompt] = useState('');
  const [voiceRefinedPrompt, setVoiceRefinedPrompt] = useState('');
  const [voiceFirstMessage, setVoiceFirstMessage] = useState('Hello! Thanks for taking my call.');
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [sendFollowupSms, setSendFollowupSms] = useState(true);
  const [selectedLeadPhones, setSelectedLeadPhones] = useState<Set<string>>(new Set());
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  const fetchCampaigns = async () => {
    try {
      const userId = user?.user_id || 'user_12345_john_doe';
      const res = await fetch(`http://localhost:8000/api/campaigns?user_id=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedData = data.map((c: any) => ({
          ...c,
          icon: c.type === 'LinkedIn' ? Share2 : c.type === 'Voice' ? PhoneCall : c.type === 'SMS' ? MessageCircle : Mail
        }));
        setCampaignsList(mappedData);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCampaigns();
      } else {
        alert('Failed to delete campaign');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting campaign');
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const displayedCampaigns = campaignsList.filter(c => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return c.status === 'Active';
    if (activeTab === 'Paused') return c.status === 'Paused';
    if (activeTab === 'Drafts') return c.status === 'Draft';
    return true;
  });

  useEffect(() => {
    if (viewingCampaign) {
      const type = viewingCampaign.type?.toLowerCase();
      if (['email', 'sms', 'call', 'voice'].includes(type)) {
        fetchLeads();
      }
      if (type === 'sms' && viewingCampaign.status === 'Active') {
        fetchSmsLogs(viewingCampaign.id);
      } else {
        setSmsLogs([]);
      }
    }
  }, [viewingCampaign]);

  const fetchSmsLogs = async (campaignId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/campaigns/sms/logs?campaign_id=${campaignId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setSmsLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch SMS logs', err);
    }
  };

  useEffect(() => {
    if (showCreateModal && (campaignType === 'email' || campaignType === 'sms' || campaignType === 'voice')) {
      fetchLeads();
    }
  }, [showCreateModal, campaignType]);

  const fetchLeads = async () => {
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';

      // Fetch both leads and imported contacts in parallel
      const [leadsRes, contactsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/leads?user_id=${currentUserId}`),
        fetch(`http://localhost:8000/api/contacts`)
      ]);

      const leadsData = await leadsRes.json();
      const contactsData = await contactsRes.json();

      let allGroups: any[] = [];

      if (leadsData.success && leadsData.industry_groups) {
        allGroups = [...leadsData.industry_groups];
      }

      if (contactsData.success && contactsData.contact_groups) {
        const mappedContacts = contactsData.contact_groups.map((cg: any) => ({
          industry: `(CSV) ${cg.list_name}`,
          lead_count: cg.contact_count,
          leads: cg.contacts
        }));
        allGroups = [...allGroups, ...mappedContacts];
      }

      setIndustryGroups(allGroups);
    } catch (err) {
      console.error('Failed to fetch audiences:', err);
    }
  };

  const toggleIndustryExpanded = (industry: string) => {
    setExpandedIndustries(prev => {
      const next = new Set(prev);
      if (next.has(industry)) next.delete(industry);
      else next.add(industry);
      return next;
    });
  };

  const toggleLeadSelection = (email: string) => {
    setSelectedLeadEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleIndustrySelection = (industry: string, leads: any[] = []) => {
    setSelectedIndustries(prev => {
      const next = new Set(prev);
      const isCurrentlySelected = next.has(industry);

      const activeType = viewingCampaign ? viewingCampaign.type?.toLowerCase() : campaignType;
      const isSmsOrVoice = ['sms', 'voice', 'call'].includes(activeType);

      if (isSmsOrVoice) {
        setSelectedLeadPhones(prevPhones => {
          const nextPhones = new Set(prevPhones);
          if (isCurrentlySelected) {
            next.delete(industry);
            leads.filter(l => l.phone).forEach(l => nextPhones.delete(l.phone));
          } else {
            next.add(industry);
            leads.filter(l => l.phone).forEach(l => nextPhones.add(l.phone));
          }
          return nextPhones;
        });
      } else {
        setSelectedLeadEmails(prevEmails => {
          const nextEmails = new Set(prevEmails);
          if (isCurrentlySelected) {
            next.delete(industry);
            leads.filter(l => l.email).forEach(l => nextEmails.delete(l.email));
          } else {
            next.add(industry);
            leads.filter(l => l.email).forEach(l => nextEmails.add(l.email));
          }
          return nextEmails;
        });
      }
      return next;
    });
  };

  const handleSendExistingCampaign = async () => {
    setIsSendingEmail(true);
    try {
      const activeType = viewingCampaign.type?.toLowerCase();
      const isSms = activeType === 'sms';
      const isVoice = activeType === 'voice' || activeType === 'call';

      // Collect leads
      let collectedLeads: any[] = [];
      industryGroups.forEach(g => {
        g.leads.forEach((l: any) => {
          if (isSms || isVoice) {
            if (l.phone && selectedLeadPhones.has(l.phone)) {
              collectedLeads.push(l);
            }
          } else {
            if (l.email && selectedLeadEmails.has(l.email)) {
              if (!onlyVerifiedEmails || l.is_verified) {
                collectedLeads.push(l);
              }
            }
          }
        });
      });

      let endpoint = 'http://localhost:8000/api/campaigns/email/send';
      let payload: any = {
        campaign_id: viewingCampaign.id,
        user_id: user?.user_id || "user_12345_john_doe",
        subject: viewingCampaign.name,
        content: viewingCampaign.content || "Email Content",
        method: "leads",
        leads: collectedLeads.map(l => ({ name: l.name, email: l.email }))
      };

      if (isSms) {
        endpoint = 'http://localhost:8000/api/campaigns/sms/publish';
        payload = {
          action: 'post',
          content: viewingCampaign.content || "SMS Content",
          image_url: viewingCampaign.image_url || "",
          user_id: user?.user_id || "user_12345_john_doe",
          name: viewingCampaign.name || "SMS Campaign",
          method: "leads",
          leads: collectedLeads.map(l => ({ name: l.name, phone: l.phone }))
        };
      } else if (isVoice) {
        endpoint = 'http://localhost:8000/api/campaigns/voice/publish';
        payload = {
          user_id: user?.user_id || "user_12345_john_doe",
          name: viewingCampaign.name || 'Voice Campaign',
          prompt: viewingCampaign.content || "",
          first_message: 'Hello! Thanks for taking my call.',
          leads: collectedLeads.map(l => ({ name: l.name, phone: l.phone })),
          send_followup_sms: true,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          if (window.confirm((data.detail || data.message) + "\n\nClick OK to go to the Billing page to recharge your tokens.")) {
            window.location.href = '/app/billing';
          }
        } else {
          alert("Error: " + (data.detail || data.message || "Failed to send campaign"));
        }
        setIsSendingEmail(false);
        return;
      }
      
      if (data.status === 'error') {
        if (data.message && data.message.includes('Twilio')) {
          if (window.confirm(data.message + "\n\nWould you like to go to the Integrations page to connect it now?")) {
            window.location.href = '/app/integrations';
            return;
          }
        } else {
          alert("Error: " + data.message);
        }
      } else {
        alert(data.message || 'Campaign sent successfully');
      }

      setViewingCampaign(null);
      setSelectedIndustries(new Set());
      setSelectedLeadEmails(new Set());
      setSelectedLeadPhones(new Set());
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to send campaign');
    }
    setIsSendingEmail(false);
  };

  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    try {
      const res = await fetch('http://localhost:8000/api/campaigns/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: campaignType,
          objective: objective,
          action: action,
          product_name: productName,
          target_customer: targetCustomer,
          call_to_action: callToAction,
          product_info: productInfo
        })
      });
      const data = await res.json();
      setGeneratedContent(data.content);
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTo({ top: modalRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error(err);
      alert('Failed to generate content');
    }
    setIsGeneratingContent(false);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/campaigns/linkedin/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImageUrl('http://localhost:8000' + data.image_url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    }
    setIsUploadingImage(false);
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch('http://localhost:8000/api/campaigns/linkedin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: generatedContent })
      });
      const data = await res.json();
      setImageUrl('http://localhost:8000' + data.image_url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image');
    }
    setIsGeneratingImage(false);
  };

  // Voice: Refine prompt via AI
  const handleRefineVoicePrompt = async () => {
    setIsRefiningPrompt(true);
    try {
      const res = await fetch('http://localhost:8000/api/campaigns/voice/refine-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.user_id || 'user_12345_john_doe',
          raw_prompt: voiceRawPrompt,
          product_name: productName,
          target_customer: targetCustomer,
          call_to_action: callToAction,
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setVoiceRefinedPrompt(data.refined_prompt);
      } else {
        alert(data.message || 'Failed to refine prompt');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to refine voice prompt');
    }
    setIsRefiningPrompt(false);
  };

  // Voice: toggle phone selection
  const toggleLeadPhoneSelection = (phone: string) => {
    setSelectedLeadPhones(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  // Voice: toggle all phones in industry
  const toggleIndustryPhoneSelection = (industry: string, leads: any[]) => {
    const phonesInGroup = (leads || []).filter((l: any) => l.phone).map((l: any) => l.phone);
    setSelectedLeadPhones(prev => {
      const next = new Set(prev);
      const allSelected = phonesInGroup.every((p: string) => next.has(p));
      if (allSelected) {
        phonesInGroup.forEach((p: string) => next.delete(p));
      } else {
        phonesInGroup.forEach((p: string) => next.add(p));
      }
      return next;
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      if (campaignType === 'voice') {
        // Voice campaign publish
        let collectedLeads: any[] = [];
        industryGroups.forEach((g: any) => {
          (g.leads || []).forEach((l: any) => {
            if (selectedLeadPhones.has(l.phone)) {
              collectedLeads.push({ name: l.name, phone: l.phone });
            }
          });
        });

        const res = await fetch('http://localhost:8000/api/campaigns/voice/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.user_id || 'user_12345_john_doe',
            name: campaignName || productName || 'Voice Campaign',
            prompt: voiceRefinedPrompt || voiceRawPrompt,
            first_message: voiceFirstMessage,
            leads: collectedLeads,
            send_followup_sms: sendFollowupSms,
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402) {
            if (window.confirm((data.detail || data.message) + "\n\nClick OK to go to the Billing page to recharge your tokens.")) {
              window.location.href = '/app/billing';
            }
          } else {
            alert("Error: " + (data.detail || data.message || "Failed to publish"));
          }
          setIsPublishing(false);
          return;
        }
        alert(data.message);
      } else if (campaignType === 'sms') {
        let collectedLeads: any[] = [];
        industryGroups.forEach(g => {
          (g.leads || []).forEach((l: any) => {
            if (l.phone && selectedLeadPhones.has(l.phone)) {
              collectedLeads.push(l);
            }
          });
        });
        
        const res = await fetch('http://localhost:8000/api/campaigns/sms/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            content: generatedContent,
            image_url: imageUrl,
            user_id: user?.user_id || "user_12345_john_doe",
            name: campaignName || productName || "SMS Campaign",
            method: "leads",
            leads: collectedLeads.map(l => ({ name: l.name, phone: l.phone }))
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402) {
            if (window.confirm((data.detail || data.message) + "\n\nClick OK to go to the Billing page to recharge your tokens.")) {
              window.location.href = '/app/billing';
            }
          } else {
            alert("Error: " + (data.detail || data.message || "Failed to publish"));
          }
          setIsPublishing(false);
          return;
        }
        if (data.status === 'error') {
          if (data.message && data.message.includes('Twilio')) {
            if (window.confirm(data.message + "\n\nWould you like to go to the Integrations page to connect it now?")) {
              window.location.href = '/app/integrations';
              return;
            }
          } else {
            alert("Error: " + data.message);
          }
        } else {
          alert(data.message);
        }
      } else if (campaignType === 'email') {
        let collectedLeads: any[] = [];
        industryGroups.forEach(g => {
          (g.leads || []).forEach((l: any) => {
            if (l.email && selectedLeadEmails.has(l.email)) {
              if (!onlyVerifiedEmails || l.is_verified) {
                collectedLeads.push(l);
              }
            }
          });
        });

        const res = await fetch('http://localhost:8000/api/campaigns/email/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            content: generatedContent,
            image_url: imageUrl,
            user_id: user?.user_id || "user_12345_john_doe",
            name: campaignName || productName || "EMAIL Campaign",
            method: "leads",
            leads: collectedLeads.map(l => ({ name: l.name, email: l.email, phone: l.phone }))
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402) {
            if (window.confirm((data.detail || data.message) + "\n\nClick OK to go to the Billing page to recharge your tokens.")) {
              window.location.href = '/app/billing';
            }
          } else {
            alert("Error: " + (data.detail || data.message || "Failed to publish"));
          }
          setIsPublishing(false);
          return;
        }
        if (data.status === 'error') {
          alert("Error: " + data.message);
          setIsPublishing(false);
          return;
        } else {
          alert(data.message);
        }
      } else {
        const res = await fetch('http://localhost:8000/api/campaigns/linkedin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            content: generatedContent,
            image_url: imageUrl,
            user_id: user?.user_id || "user_12345_john_doe",
            name: campaignName || productName || "LinkedIn Campaign"
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402) {
            if (window.confirm((data.detail || data.message) + "\n\nClick OK to go to the Billing page to recharge your tokens.")) {
              window.location.href = '/app/billing';
            }
          } else {
            alert("Error: " + (data.detail || data.message || "Failed to publish"));
          }
          setIsPublishing(false);
          return;
        }
        alert(data.message);
      }

      setShowCreateModal(false);
      setGeneratedContent('');
      setImageUrl('');
      setCampaignName('');
      setProductName('');
      setTargetCustomer('');
      setCallToAction('');
      setProductInfo('');
      setImageOption('none');
      setSelectedIndustries(new Set());
      setVoiceRawPrompt('');
      setVoiceRefinedPrompt('');
      setVoiceFirstMessage('Hello! Thanks for taking my call.');
      setSelectedLeadPhones(new Set());
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to publish campaign');
    }
    setIsPublishing(false);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      if (campaignType === 'voice') {
        const res = await fetch('http://localhost:8000/api/campaigns/voice/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.user_id || 'user_12345_john_doe',
            name: campaignName || productName || 'Untitled Voice Campaign',
            prompt: voiceRefinedPrompt || voiceRawPrompt,
            first_message: voiceFirstMessage,
            leads: [],
          })
        });
        const data = await res.json();
        alert(data.message);
      } else {
        const res = await fetch('http://localhost:8000/api/campaigns/linkedin/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            content: generatedContent,
            image_url: imageUrl,
            user_id: user?.user_id || "user_12345_john_doe",
            name: campaignName || productName || "Untitled Campaign"
          })
        });
        const data = await res.json();
        alert(data.message);
      }
      setShowCreateModal(false);
      setGeneratedContent('');
      setImageUrl('');
      setCampaignName('');
      setProductName('');
      setTargetCustomer('');
      setCallToAction('');
      setProductInfo('');
      setImageOption('none');
      setVoiceRawPrompt('');
      setVoiceRefinedPrompt('');
      setVoiceFirstMessage('Hello! Thanks for taking my call.');
      setSelectedLeadPhones(new Set());
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to save draft');
    }
    setIsSavingDraft(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500">Manage and monitor your automated multi-channel outreach.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', value: '8' },
          { label: 'Total Prospects', value: '14,230' },
          { label: 'Avg Open Rate', value: '42.5%' },
          { label: 'Meetings Booked', value: '142' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-[#F2DED6] shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white border border-[#F2DED6] rounded-lg p-1 shadow-sm">
          {['All', 'Active', 'Paused', 'Drafts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                ? 'bg-[#FDF8F5] text-primary shadow-sm border border-[#F2DED6]'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Campaign List */}
      <div className="grid grid-cols-1 gap-4">
        {displayedCampaigns.map((campaign, idx) => (
          <div
            key={campaign.id || idx}
            className="bg-white hover:bg-gray-50 rounded-xl p-5 border border-[#F2DED6] shadow-sm flex flex-col md:flex-row items-center gap-6 transition-colors cursor-pointer"
            onClick={() => setViewingCampaign(campaign)}
          >
            {/* Info */}
            <div className="flex items-center gap-4 flex-1 w-full">
              <div className="w-12 h-12 rounded-xl bg-[#FDF8F5] border border-[#F2DED6] flex items-center justify-center shrink-0">
                <campaign.icon className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {campaign.date}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span>{campaign.type} Campaign</span>
                </div>
              </div>
            </div>

            {/* Status & Progress */}
            <div className="w-full md:w-48">
              <div className="flex justify-between items-end mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${campaign.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' :
                  campaign.status === 'Paused' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                    'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                  {campaign.status}
                </span>
                <span className="text-xs text-gray-500 font-medium">{campaign.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 border border-gray-200">
                <div
                  className={`h-1.5 rounded-full ${campaign.status === 'Active' ? 'bg-primary' : 'bg-gray-400'}`}
                  style={{ width: `${campaign.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex gap-6 w-full md:w-auto">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sent</p>
                <p className="text-sm font-semibold text-gray-900">{campaign.sent}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Replied</p>
                <p className="text-sm font-semibold text-gray-900">{campaign.replied}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Meetings</p>
                <p className="text-sm font-semibold text-gray-900">{campaign.booked}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end" onClick={e => e.stopPropagation()}>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); }}
                className="p-2 text-red-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
                title="Delete Campaign"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {campaignType === 'voice' ? 'Create Voice Call Campaign' : `Create ${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} Campaign`}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Channel</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="voice">Voice Call</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Objective</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                  >
                    <option value="engagement">Engagement & Nurturing</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="product_launch">Product Launch</option>
                    <option value="event_management">Event Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Q3 Tech Founders Outreach"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                {campaignType === 'linkedin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn Action Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="action"
                          value="post"
                          checked={action === 'post'}
                          onChange={() => setAction('post')}
                        />
                        <span>Create a Post</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="action"
                          value="dm"
                          checked={action === 'dm'}
                          onChange={() => setAction('dm')}
                        />
                        <span>Send Direct Message</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product/Service Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Genquantaa AI Agent"
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Customer</label>
                    <input
                      type="text"
                      placeholder="e.g., CTOs, Sales Leaders in Healthcare"
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={targetCustomer}
                      onChange={(e) => setTargetCustomer(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action (Goal)</label>
                    <input
                      type="text"
                      placeholder="e.g., Book a demo, Read the blog, Reply to this message"
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session/Product Details</label>
                    <textarea
                      placeholder="e.g., Features, benefits, what makes it special, or session agenda..."
                      className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-24"
                      value={productInfo}
                      onChange={(e) => setProductInfo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Voice-specific form section */}
                {campaignType === 'voice' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Mic className="w-4 h-4 text-primary" />
                        What should your AI voice agent say?
                      </label>
                      <textarea
                        placeholder="Describe what you want your AI agent to say on the call. For example: 'Call the prospect, introduce yourself as a representative from [Company], ask if they're interested in [Product], handle objections about pricing, and try to book a meeting...'"
                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-32"
                        value={voiceRawPrompt}
                        onChange={(e) => setVoiceRawPrompt(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleRefineVoicePrompt}
                      disabled={isRefiningPrompt || !voiceRawPrompt}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      {isRefiningPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isRefiningPrompt ? 'Refining with AI...' : 'Refine Prompt with AI'}
                    </button>

                    {voiceRefinedPrompt && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Refined AI Agent Script (editable)</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[200px] text-sm font-mono bg-gray-50"
                          value={voiceRefinedPrompt}
                          onChange={(e) => setVoiceRefinedPrompt(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Message (opening line)</label>
                      <input
                        type="text"
                        placeholder="Hello! Thanks for taking my call."
                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={voiceFirstMessage}
                        onChange={(e) => setVoiceFirstMessage(e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                      <input
                        type="checkbox"
                        checked={sendFollowupSms}
                        onChange={(e) => setSendFollowupSms(e.target.checked)}
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm font-medium text-blue-800">Send follow-up SMS after each call</span>
                    </label>

                    {/* Lead phone selection for voice */}
                    {(voiceRefinedPrompt || voiceRawPrompt) && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <PhoneCall className="w-4 h-4" />
                          Select Leads to Call ({selectedLeadPhones.size} selected)
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto bg-white p-2 border border-gray-200 rounded">
                          {industryGroups.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No leads found. Discover leads first.</p>
                          ) : (
                            industryGroups.map((group: any) => (
                              <div key={group.industry} className="flex flex-col border border-gray-200 rounded overflow-hidden mb-1">
                                <div className="flex items-center p-2 hover:bg-gray-50 bg-white">
                                  <input
                                    type="checkbox"
                                    checked={(group.leads || []).filter((l: any) => l.phone).every((l: any) => selectedLeadPhones.has(l.phone))}
                                    onChange={() => toggleIndustryPhoneSelection(group.industry, group.leads)}
                                    className="w-3.5 h-3.5 mr-2 text-primary focus:ring-primary rounded border-gray-300 cursor-pointer"
                                  />
                                  <div
                                    className="flex justify-between flex-1 cursor-pointer"
                                    onClick={() => toggleIndustryExpanded(group.industry)}
                                  >
                                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                      {expandedIndustries.has(group.industry) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      {group.industry}
                                    </span>
                                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                      {(group.leads || []).filter((l: any) => l.phone).length} with phone
                                    </span>
                                  </div>
                                </div>
                                {expandedIndustries.has(group.industry) && (
                                  <div className="bg-gray-50 p-1.5 border-t border-gray-200 pl-6 max-h-32 overflow-y-auto">
                                    {(group.leads || []).filter((l: any) => l.phone).map((lead: any, i: number) => (
                                      <label key={i} className="flex items-center p-1 hover:bg-white rounded transition-colors cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selectedLeadPhones.has(lead.phone)}
                                          onChange={() => toggleLeadPhoneSelection(lead.phone)}
                                          className="w-3 h-3 text-primary focus:ring-primary rounded border-gray-300"
                                        />
                                        <div className="flex flex-col ml-2">
                                          <span className="text-xs font-medium text-gray-800">{lead.name}</span>
                                          <span className="text-[10px] text-gray-500">{lead.phone}</span>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Voice publish/draft buttons */}
                        <div className="flex gap-4 mt-4">
                          <button
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft || isPublishing}
                            className="w-1/3 bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-900 font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSavingDraft ? 'Saving...' : 'Save Draft'}
                          </button>
                          <button
                            onClick={handlePublish}
                            disabled={isPublishing || isSavingDraft || selectedLeadPhones.size === 0}
                            className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                            {isPublishing ? 'Launching Calls...' : `Call ${selectedLeadPhones.size} Lead${selectedLeadPhones.size !== 1 ? 's' : ''}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard (non-voice) form section */
                  <>
                    <button
                      onClick={handleGenerateContent}
                      disabled={isGeneratingContent || !productName || !productInfo}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                      {isGeneratingContent ? 'Generating with AI...' : 'Generate Content'}
                    </button>

                    {generatedContent && (
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Review Content</label>
                          <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[150px]"
                            value={generatedContent}
                            onChange={(e) => setGeneratedContent(e.target.value)}
                          />
                        </div>

                        {action === 'post' && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Add an Image (Optional)</label>
                            <div className="flex gap-4 mb-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="imageOption"
                                  value="none"
                                  checked={imageOption === 'none'}
                                  onChange={() => setImageOption('none')}
                                  className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700">No Image</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="imageOption"
                                  value="upload"
                                  checked={imageOption === 'upload'}
                                  onChange={() => setImageOption('upload')}
                                  className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700">Upload Image</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="imageOption"
                                  value="generate"
                                  checked={imageOption === 'generate'}
                                  onChange={() => setImageOption('generate')}
                                  className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700">AI Generate</span>
                              </label>
                            </div>

                            {imageOption === 'generate' && !imageUrl && (
                              <button
                                onClick={handleGenerateImage}
                                disabled={isGeneratingImage}
                                className="w-full bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-900 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                {isGeneratingImage ? 'Generating Image...' : 'Generate Image (FLUX.1-schnell)'}
                              </button>
                            )}

                            {imageOption === 'upload' && !imageUrl && (
                              <div className="w-full">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={fileInputRef}
                                  onChange={handleUploadImage}
                                  className="hidden"
                                />
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploadingImage}
                                  className="w-full bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-900 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                  {isUploadingImage ? 'Uploading...' : 'Click to Upload Image'}
                                </button>
                              </div>
                            )}

                            {imageUrl && imageOption !== 'none' && (
                              <div className="mt-4 border border-gray-200 rounded-lg p-2 bg-white relative">
                                <img src={imageUrl} alt="Campaign Media" className="w-full h-auto rounded-md object-contain max-h-[300px]" />
                                <button
                                  onClick={() => setImageUrl('')}
                                  className="absolute top-4 right-4 bg-white/80 p-1.5 rounded-full hover:bg-white text-gray-700 shadow-sm"
                                  title="Remove Image"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {['email', 'sms'].includes(campaignType) && (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Audience</h3>
                            <div className="mb-3">
                              <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 p-2 rounded border border-emerald-200">
                                <input
                                  type="checkbox"
                                  checked={onlyVerifiedEmails}
                                  onChange={(e) => setOnlyVerifiedEmails(e.target.checked)}
                                  className="text-emerald-600 focus:ring-emerald-500 rounded"
                                />
                                <span className="text-sm font-medium text-emerald-800">Only send to Verified Emails</span>
                              </label>
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto bg-white p-2 border border-gray-200 rounded">
                              {industryGroups.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No leads found. Discover leads first.</p>
                              ) : (
                                industryGroups.map(group => (
                                  <div key={group.industry} className="flex flex-col border border-gray-200 rounded overflow-hidden mb-1">
                                    <div className="flex items-center p-2 hover:bg-gray-50 bg-white">
                                      <input
                                        type="checkbox"
                                        checked={selectedIndustries.has(group.industry)}
                                        onChange={() => toggleIndustrySelection(group.industry, group.leads)}
                                        className="w-3.5 h-3.5 mr-2 text-primary focus:ring-primary rounded border-gray-300 cursor-pointer"
                                      />
                                      <div
                                        className="flex justify-between flex-1 cursor-pointer"
                                        onClick={() => toggleIndustryExpanded(group.industry)}
                                      >
                                        <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                          {expandedIndustries.has(group.industry) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                          {group.industry}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{group.lead_count} leads</span>
                                      </div>
                                    </div>
                                    {expandedIndustries.has(group.industry) && (
                                      <div className="bg-gray-50 p-1.5 border-t border-gray-200 pl-6 max-h-32 overflow-y-auto">
                                        {(group.leads || [])
                                          .filter((l: any) => campaignType === 'sms' ? l.phone : l.email)
                                          .map((lead: any, i: number) => {
                                            const isSelected = campaignType === 'sms' ? selectedLeadPhones.has(lead.phone) : selectedLeadEmails.has(lead.email);
                                            const isDisabled = campaignType === 'email' && onlyVerifiedEmails && !lead.is_verified;
                                            return (
                                              <label key={i} className={`flex items-center p-1 hover:bg-white rounded transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => {
                                                    if (!isDisabled) {
                                                      if (campaignType === 'sms') {
                                                        toggleLeadPhoneSelection(lead.phone);
                                                      } else {
                                                        toggleLeadSelection(lead.email);
                                                      }
                                                    }
                                                  }}
                                                  disabled={isDisabled}
                                                  className="w-3 h-3 text-primary focus:ring-primary rounded border-gray-300 disabled:opacity-50"
                                                />
                                                <div className="flex flex-col ml-2">
                                                  <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
                                                    {lead.name || 'Unnamed'}
                                                    {campaignType === 'email' && lead.is_verified && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded leading-none">✓ Verified</span>}
                                                  </span>
                                                  <span className="text-[10px] text-gray-500">{campaignType === 'sms' ? lead.phone : lead.email}</span>
                                                </div>
                                              </label>
                                            );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft || isPublishing}
                            className="w-1/3 bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-900 font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSavingDraft ? 'Saving...' : 'Save Draft'}
                          </button>

                          <button
                            onClick={handlePublish}
                            disabled={isPublishing || isSavingDraft || (campaignType === 'email' && audienceMethod === 'leads' && selectedLeadEmails.size === 0) || (campaignType === 'email' && audienceMethod === 'upload' && !uploadFile)}
                            className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isPublishing ? 'Publishing...' : `Publish to ${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* SMS Logs Section */}
                {viewingCampaign && viewingCampaign.type?.toLowerCase() === 'sms' && viewingCampaign.status === 'Active' && (
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      Sent Messages Log ({smsLogs.length})
                    </h3>
                    {smsLogs.length === 0 ? (
                      <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-200">No messages have been sent yet.</p>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <th className="p-3">Recipient</th>
                              <th className="p-3 w-1/2">Message Content</th>
                              <th className="p-3">Sent At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {smsLogs.map((log: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50 text-sm align-top">
                                <td className="p-3">
                                  <div className="font-medium text-gray-900">{log.lead_name || 'Unknown'}</div>
                                  <div className="text-gray-500 text-xs mt-0.5">{log.lead_phone}</div>
                                </td>
                                <td className="p-3 text-gray-700">
                                  <div className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-100 p-2 rounded">{log.content}</div>
                                </td>
                                <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                                  {new Date(log.sent_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View Campaign Modal */}
      {viewingCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FDF8F5] border border-[#F2DED6] flex items-center justify-center">
                  {viewingCampaign.icon && <viewingCampaign.icon className="w-5 h-5 text-gray-500" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingCampaign.name}</h2>
                  <p className="text-sm text-gray-500">{viewingCampaign.type} Campaign • {viewingCampaign.status}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => deleteCampaign(viewingCampaign.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Campaign"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={() => setViewingCampaign(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Campaign Content */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Campaign Content</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                  {viewingCampaign.content || "No additional content details available for this older campaign."}
                </div>
              </div>

              {viewingCampaign.image_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Attached Image</h3>
                  <img src={viewingCampaign.image_url.startsWith('http') ? viewingCampaign.image_url : `http://localhost:8000${viewingCampaign.image_url}`} alt="Campaign" className="w-full max-w-sm rounded-lg border border-gray-200" />
                </div>
              )}

              {/* Audience Viewer or Send Section */}
              {viewingCampaign.audience ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Audience ({viewingCampaign.audience.length})</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="p-3">Name</th>
                          <th className="p-3">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {viewingCampaign.audience.map((member: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 text-sm">
                            <td className="p-3 text-gray-900 font-medium">{member.name || 'Unknown'}</td>
                            <td className="p-3 text-gray-500">{member.contact || member.email || member.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Campaign</h3>
                  {/* Sending UI */}
                      <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <input
                        type="checkbox"
                        checked={onlyVerifiedEmails}
                        onChange={(e) => setOnlyVerifiedEmails(e.target.checked)}
                        className="text-emerald-600 focus:ring-emerald-500 rounded"
                      />
                      <span className="text-sm font-medium text-emerald-800">Only send to Verified Emails</span>
                    </label>
                  </div>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-2">Select industries to send to:</p>
                    {industryGroups.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No leads found. Discover leads first.</p>
                    ) : (
                        industryGroups.map(group => (
                          <div key={group.industry} className="flex flex-col border border-gray-200 rounded overflow-hidden">
                            <div className="flex items-center p-2 hover:bg-gray-50 bg-white">
                              <input
                                type="checkbox"
                                checked={selectedIndustries.has(group.industry)}
                                onChange={() => toggleIndustrySelection(group.industry, group.leads)}
                                className="w-4 h-4 mr-3 text-primary focus:ring-primary rounded border-gray-300 cursor-pointer"
                              />
                              <div
                                className="flex justify-between flex-1 cursor-pointer"
                                onClick={() => toggleIndustryExpanded(group.industry)}
                              >
                                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                  {expandedIndustries.has(group.industry) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  {group.industry}
                                </span>
                                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{group.lead_count} leads</span>
                              </div>
                            </div>
                            {expandedIndustries.has(group.industry) && (
                              <div className="bg-gray-50 p-2 border-t border-gray-200 pl-8 max-h-40 overflow-y-auto">
                                {(group.leads || [])
                                  .filter((l: any) => {
                                    const t = viewingCampaign.type?.toLowerCase();
                                    return (t === 'sms' || t === 'call' || t === 'voice') ? l.phone : l.email;
                                  })
                                  .map((lead: any, i: number) => {
                                    const t = viewingCampaign.type?.toLowerCase();
                                    const isSmsOrCall = (t === 'sms' || t === 'call' || t === 'voice');
                                    const isSelected = isSmsOrCall ? selectedLeadPhones.has(lead.phone) : selectedLeadEmails.has(lead.email);
                                    const isDisabled = !isSmsOrCall && onlyVerifiedEmails && !lead.is_verified;
                                    
                                    return (
                                      <label key={i} className={`flex items-center p-1.5 hover:bg-white rounded transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => { 
                                            if (!isDisabled) {
                                              if (isSmsOrCall) {
                                                toggleLeadPhoneSelection(lead.phone);
                                              } else {
                                                toggleLeadSelection(lead.email);
                                              }
                                            }
                                          }}
                                          disabled={isDisabled}
                                          className="w-3.5 h-3.5 text-primary focus:ring-primary rounded border-gray-300 disabled:opacity-50"
                                        />
                                        <div className="flex flex-col ml-3">
                                          <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                                            {lead.name || 'Unnamed'}
                                            {!isSmsOrCall && lead.is_verified && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded leading-none">✓ Verified</span>}
                                          </span>
                                          <span className="text-xs text-gray-500">{isSmsOrCall ? lead.phone : lead.email}</span>
                                        </div>
                                      </label>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  <div className="mt-6">
                    <button
                      onClick={handleSendExistingCampaign}
                      disabled={isSendingEmail || (viewingCampaign.type?.toLowerCase() === 'sms' || viewingCampaign.type?.toLowerCase() === 'voice' || viewingCampaign.type?.toLowerCase() === 'call' ? selectedLeadPhones.size === 0 : selectedLeadEmails.size === 0)}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {isSendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {isSendingEmail ? 'Sending...' : `Send ${viewingCampaign.type || 'Email'} Campaign`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
