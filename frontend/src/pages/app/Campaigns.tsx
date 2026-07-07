import { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Play, Pause, Search, Calendar, PhoneCall, Mail, Share2, MessageCircle, X, Loader2, Image as ImageIcon, Send, Upload, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const mockCampaigns = [
  { id: 1, name: 'Q3 Enterprise Outreach', status: 'Active', type: 'Email', progress: 65, sent: 1245, replied: 84, booked: 12, date: 'Oct 12, 2026', icon: Mail },
  { id: 2, name: 'AI Founders Qualification', status: 'Active', type: 'Call', progress: 40, sent: 300, replied: 45, booked: 8, date: 'Oct 10, 2026', icon: PhoneCall },
  { id: 3, name: 'Healthcare Leads Nurture', status: 'Paused', type: 'LinkedIn', progress: 15, sent: 150, replied: 12, booked: 1, date: 'Oct 05, 2026', icon: Share2 },
  { id: 4, name: 'Follow up - Webinar', status: 'Draft', type: 'WhatsApp', progress: 0, sent: 0, replied: 0, booked: 0, date: 'Oct 15, 2026', icon: MessageCircle },
];

export default function Campaigns() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const [campaignsList, setCampaignsList] = useState<any[]>(mockCampaigns);

  // View Campaign State
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);
  const [industryGroups, setIndustryGroups] = useState<any[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [audienceMethod, setAudienceMethod] = useState<'leads' | 'upload'>('leads');
  const [selectedLeadEmails, setSelectedLeadEmails] = useState<Set<string>>(new Set());
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  const fetchCampaigns = async () => {
    try {
      const userId = user?.user_id || 'user_12345_john_doe';
      const res = await fetch(`http://localhost:8000/api/campaigns?user_id=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedData = data.map((c: any) => ({
          ...c,
          icon: c.type === 'LinkedIn' ? Share2 : Mail
        }));
        // Use a Set or just simple prepend if there are no duplicates to worry about for now
        setCampaignsList([...mappedData, ...mockCampaigns]);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
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
    if (viewingCampaign && viewingCampaign.type?.toLowerCase() === 'email') {
      fetchLeads();
    }
  }, [viewingCampaign]);

  useEffect(() => {
    if (showCreateModal && campaignType === 'email') {
      fetchLeads();
    }
  }, [showCreateModal, campaignType]);

  const fetchLeads = async () => {
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';
      
      // Fetch both leads and imported contacts in parallel
      const [leadsRes, contactsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/leads?user_id=${currentUserId}`),
        fetch(`http://localhost:8000/api/contacts?user_id=${currentUserId}`)
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
      
      setSelectedLeadEmails(prevEmails => {
        const nextEmails = new Set(prevEmails);
        if (isCurrentlySelected) {
          next.delete(industry);
          leads.forEach(l => nextEmails.delete(l.email));
        } else {
          next.add(industry);
          leads.forEach(l => nextEmails.add(l.email));
        }
        return nextEmails;
      });
      return next;
    });
  };

  const handleSendEmailCampaign = async () => {
    setIsSendingEmail(true);
    try {
      // Collect leads
      let collectedLeads: any[] = [];
      if (audienceMethod === 'leads') {
        industryGroups.forEach(g => {
          g.leads.forEach((l: any) => {
            if (selectedLeadEmails.has(l.email)) {
              collectedLeads.push(l);
            }
          });
        });
      }

      const res = await fetch('http://localhost:8000/api/campaigns/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: viewingCampaign.id,
          user_id: user?.user_id || "user_12345_john_doe",
          subject: viewingCampaign.name,
          content: viewingCampaign.content || "Email Content",
          method: audienceMethod,
          leads: collectedLeads.map(l => ({ name: l.name, email: l.email }))
        })
      });
      const data = await res.json();
      alert(data.message);
      setViewingCampaign(null);
      setSelectedIndustries(new Set());
      setSelectedLeadEmails(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to send email campaign');
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

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      if (campaignType === 'email') {
        let collectedLeads: any[] = [];
        if (audienceMethod === 'leads') {
          industryGroups.forEach(g => {
            (g.leads || []).forEach((l: any) => {
              if (selectedLeadEmails.has(l.email)) {
                collectedLeads.push(l);
              }
            });
          });
        }
        
        const res = await fetch('http://localhost:8000/api/campaigns/email/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action, 
            content: generatedContent, 
            user_id: user?.user_id || "user_12345_john_doe",
            name: productName || "Email Campaign",
            method: audienceMethod,
            leads: collectedLeads.map(l => ({ name: l.name, email: l.email }))
          })
        });
        const data = await res.json();
        alert(data.message);
      } else {
        const res = await fetch('http://localhost:8000/api/campaigns/linkedin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action, 
            content: generatedContent, 
            image_url: imageUrl,
            user_id: user?.user_id || "user_12345_john_doe" 
          })
        });
        const data = await res.json();
        alert(data.message);
      }
      
      setShowCreateModal(false);
      setGeneratedContent('');
      setImageUrl('');
      setProductName('');
      setTargetCustomer('');
      setCallToAction('');
      setProductInfo('');
      setImageOption('none');
      setSelectedIndustries(new Set());
      fetchCampaigns(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert('Failed to publish campaign');
    }
    setIsPublishing(false);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const res = await fetch('http://localhost:8000/api/campaigns/linkedin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          content: generatedContent, 
          image_url: imageUrl,
          user_id: user?.user_id || "user_12345_john_doe",
          name: productName || "Untitled Campaign"
        })
      });
      const data = await res.json();
      alert(data.message);
      setShowCreateModal(false);
      setGeneratedContent('');
      setImageUrl('');
      setProductName('');
      setTargetCustomer('');
      setCallToAction('');
      setProductInfo('');
      setImageOption('none');
      fetchCampaigns(); // Refresh the list
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
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  campaign.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' :
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
              {campaign.status === 'Active' ? (
                <button className="p-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm">
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button className="p-2 text-gray-500 hover:text-primary bg-white hover:bg-primary/10 rounded-lg transition-colors border border-gray-200 shadow-sm">
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button className="p-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm">
                <MoreVertical className="w-4 h-4" />
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
              <h2 className="text-xl font-bold text-gray-900">Create LinkedIn Campaign</h2>
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

                      {campaignType === 'email' && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Audience</h3>
                          <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="newAudienceMethod" 
                                value="leads" 
                                checked={audienceMethod === 'leads'} 
                                onChange={() => setAudienceMethod('leads')} 
                                className="text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-gray-700">CRM Leads</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="newAudienceMethod" 
                                value="upload" 
                                checked={audienceMethod === 'upload'} 
                                onChange={() => setAudienceMethod('upload')} 
                                className="text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-gray-700">Upload CSV</span>
                            </label>
                          </div>

                          {audienceMethod === 'leads' ? (
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
                                          {expandedIndustries.has(group.industry) ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                                          {group.industry}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{group.lead_count} leads</span>
                                      </div>
                                    </div>
                                    {expandedIndustries.has(group.industry) && (
                                      <div className="bg-gray-50 p-1.5 border-t border-gray-200 pl-6 max-h-32 overflow-y-auto">
                                        { (group.leads || []).map((lead: any, i: number) => (
                                          <label key={i} className="flex items-center p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                            <input 
                                              type="checkbox"
                                              checked={selectedLeadEmails.has(lead.email)}
                                              onChange={() => toggleLeadSelection(lead.email)}
                                              className="w-3 h-3 text-primary focus:ring-primary rounded border-gray-300"
                                            />
                                            <div className="flex flex-col ml-2">
                                              <span className="text-xs font-medium text-gray-800">{lead.name}</span>
                                              <span className="text-[10px] text-gray-500">{lead.email}</span>
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded border border-gray-200 border-dashed text-center">
                              <input 
                                type="file" 
                                accept=".csv"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                              />
                              {uploadFile && <p className="text-xs text-green-600 mt-1">Ready: {uploadFile.name}</p>}
                            </div>
                          )}
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
              <button onClick={() => setViewingCampaign(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
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

              {/* Email Sending Section */}
              {viewingCampaign.type?.toLowerCase() === 'email' && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Campaign</h3>
                  
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="audienceMethod" 
                        value="leads" 
                        checked={audienceMethod === 'leads'} 
                        onChange={() => setAudienceMethod('leads')} 
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">Select from CRM Leads</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="audienceMethod" 
                        value="upload" 
                        checked={audienceMethod === 'upload'} 
                        onChange={() => setAudienceMethod('upload')} 
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">Upload CSV Contacts</span>
                    </label>
                  </div>

                  {audienceMethod === 'leads' ? (
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
                                  {expandedIndustries.has(group.industry) ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                                  {group.industry}
                                </span>
                                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{group.lead_count} leads</span>
                              </div>
                            </div>
                            {expandedIndustries.has(group.industry) && (
                              <div className="bg-gray-50 p-2 border-t border-gray-200 pl-8 max-h-40 overflow-y-auto">
                                { (group.leads || []).map((lead: any, i: number) => (
                                  <label key={i} className="flex items-center p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={selectedLeadEmails.has(lead.email)}
                                      onChange={() => toggleLeadSelection(lead.email)}
                                      className="w-3.5 h-3.5 text-primary focus:ring-primary rounded border-gray-300"
                                    />
                                    <div className="flex flex-col ml-3">
                                      <span className="text-sm font-medium text-gray-800">{lead.name}</span>
                                      <span className="text-xs text-gray-500">{lead.email}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Upload a CSV file containing Name and Email columns.</p>
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer mx-auto max-w-xs"
                      />
                      {uploadFile && <p className="text-xs text-green-600 mt-2">File selected: {uploadFile.name}</p>}
                    </div>
                  )}

                  <div className="mt-6">
                    <button
                      onClick={handleSendEmailCampaign}
                      disabled={isSendingEmail || (audienceMethod === 'leads' && selectedLeadEmails.size === 0) || (audienceMethod === 'upload' && !uploadFile)}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {isSendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {isSendingEmail ? 'Sending...' : 'Send Email Campaign'}
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
