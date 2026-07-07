import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, Plus, MoreHorizontal, UserCircle, Building2, Phone, Mail, FolderOpen, ChevronDown, ChevronRight, Loader2, Trash2, Users, Globe, ExternalLink, RefreshCw, Bot, Laptop, HeartPulse, Wallet, Cloud, GraduationCap, ShoppingCart, Building, Link as LinkIcon, Folder, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Lead {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedin_url: string;
  website: string;
  location: string;
  industry: string;
  confidence: number;
  source: string;
  discovery_prompt: string;
  company_size: string;
}

interface IndustryGroup {
  industry: string;
  lead_count: number;
  leads: Lead[];
  discovery_prompts: string[];
}

// Industry color palette
const industryColors: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  'Ai': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: Bot },
  'Artificial Intelligence': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: Bot },
  'Technology': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Laptop },
  'Healthcare': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: HeartPulse },
  'Fintech': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Wallet },
  'Saas': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: Cloud },
  'Edtech': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: GraduationCap },
  'Ecommerce': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: ShoppingCart },
  'Real Estate': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: Building },
  'Blockchain': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: LinkIcon },
};

function getIndustryStyle(industry: string) {
  const key = Object.keys(industryColors).find(k => k.toLowerCase() === industry.toLowerCase());
  return key ? industryColors[key] : { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Folder };
}

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [industryGroups, setIndustryGroups] = useState<IndustryGroup[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';
      const res = await fetch(`http://localhost:8000/api/leads?user_id=${currentUserId}`);
      const data = await res.json();
      if (data.success) {
        setIndustryGroups(data.industry_groups || []);
        setTotalLeads(data.total_leads || 0);
        // Auto-expand first industry
        if (data.industry_groups?.length > 0) {
          setExpandedIndustries(new Set([data.industry_groups[0].industry]));
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const toggleIndustry = (industry: string) => {
    setExpandedIndustries(prev => {
      const next = new Set(prev);
      if (next.has(industry)) next.delete(industry);
      else next.add(industry);
      return next;
    });
  };

  const handleExportCSV = async (industry?: string) => {
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';
      const url = industry 
        ? `http://localhost:8000/api/leads/export?industry=${encodeURIComponent(industry)}&user_id=${currentUserId}`
        : `http://localhost:8000/api/leads/export?user_id=${currentUserId}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `leads_${industry || 'all'}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export leads');
    }
  };

  const handleDeleteIndustry = async (industry: string) => {
    if (!confirm(`Delete all leads in "${industry}"? This cannot be undone.`)) return;
    setDeleting(industry);
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';
      const res = await fetch(`http://localhost:8000/api/leads/industry/${encodeURIComponent(industry)}?user_id=${currentUserId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const toggleLeadSelection = (key: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllInIndustry = (group: IndustryGroup) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      const allKeys = group.leads.map((l, i) => `${group.industry}-${i}`);
      const allSelected = allKeys.every(k => next.has(k));
      if (allSelected) {
        allKeys.forEach(k => next.delete(k));
      } else {
        allKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Filter leads based on search
  const filteredGroups = industryGroups.map(group => ({
    ...group,
    leads: group.leads.filter(lead => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.title.toLowerCase().includes(q) ||
        lead.location.toLowerCase().includes(q)
      );
    })
  })).filter(g => g.leads.length > 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Management</h1>
          <p className="text-sm text-gray-500">
            {totalLeads > 0 
              ? `${totalLeads} leads across ${industryGroups.length} industries from AI Discovery` 
              : 'Discover leads first, then manage them here.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchLeads()} 
            className="flex items-center px-3 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
          <button 
            onClick={() => handleExportCSV()}
            disabled={totalLeads === 0}
            className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" /> Export All CSV
          </button>
          {selectedLeads.size > 0 && (
            <button 
              onClick={() => navigate('/app/campaigns')}
              className="flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> Add {selectedLeads.size} to Campaign
            </button>
          )}
        </div>
      </div>

      {/* Search & Stats Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-4 flex-wrap">
          {industryGroups.slice(0, 5).map(group => {
            const style = getIndustryStyle(group.industry);
            const Icon = style.icon;
            return (
              <div key={group.industry} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${style.border} ${style.bg} text-xs font-medium ${style.text}`}>
                <Icon className="w-3.5 h-3.5" />
                {group.industry}: {group.lead_count}
              </div>
            );
          })}
          {industryGroups.length > 5 && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              +{industryGroups.length - 5} more
            </div>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, email..."
            className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-gray-600 font-medium">Loading leads from database...</span>
          </div>
        </div>
      ) : totalLeads === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#FDF8F5] border border-[#F2DED6] flex items-center justify-center">
              <Users className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No Leads Yet</h3>
            <p className="text-sm text-gray-500">
              Go to <strong>Lead Discovery</strong> and search for leads using AI. 
              Discovered leads will automatically appear here, organized by industry.
            </p>
            <a 
              href="/app/discovery" 
              className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors shadow-sm font-medium"
            >
              <Search className="w-4 h-4 mr-2" /> Go to Lead Discovery
            </a>
          </div>
        </div>
      ) : (
        /* Industry Folders */
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {filteredGroups.map((group) => {
            const style = getIndustryStyle(group.industry);
            const Icon = style.icon;
            const isExpanded = expandedIndustries.has(group.industry);
            const allKeys = group.leads.map((_l, i) => `${group.industry}-${i}`);
            const allSelected = allKeys.length > 0 && allKeys.every(k => selectedLeads.has(k));

            return (
              <div key={group.industry} className="bg-white rounded-xl border border-[#F2DED6] overflow-hidden shadow-sm">
                {/* Folder Header */}
                <div 
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FDF8F5] transition-colors border-b ${isExpanded ? 'border-[#F2DED6]' : 'border-transparent'}`}
                  onClick={() => toggleIndustry(group.industry)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center text-lg`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{group.industry}</h3>
                      <p className="text-xs text-gray-500">{group.lead_count} leads • {group.discovery_prompts?.length || 0} searches</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleExportCSV(group.industry)}
                      className="flex items-center px-3 py-1.5 bg-white border border-[#F2DED6] text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                    </button>
                    <button
                      onClick={() => selectAllInIndustry(group)}
                      className={`flex items-center px-3 py-1.5 border text-xs rounded-lg transition-colors shadow-sm ${
                        allSelected 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-white border-[#F2DED6] text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={() => handleDeleteIndustry(group.industry)}
                      disabled={deleting === group.industry}
                      className="flex items-center px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {deleting === group.industry ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                      Delete
                    </button>
                  </div>
                </div>

                {/* Leads Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-500 uppercase bg-[#FDF8F5] border-b border-[#F2DED6]">
                        <tr>
                          <th scope="col" className="p-4 w-12">
                            <input 
                              type="checkbox" 
                              checked={allSelected}
                              onChange={() => selectAllInIndustry(group)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                            />
                          </th>
                          <th scope="col" className="px-5 py-3">Prospect</th>
                          <th scope="col" className="px-5 py-3">Contact</th>
                          <th scope="col" className="px-5 py-3">Company</th>
                          <th scope="col" className="px-5 py-3">Location</th>
                          <th scope="col" className="px-5 py-3">Quality</th>
                          <th scope="col" className="px-5 py-3">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.leads.map((lead, idx) => {
                          const leadKey = `${group.industry}-${idx}`;
                          const isSelected = selectedLeads.has(leadKey);

                          return (
                            <tr 
                              key={idx} 
                              className={`border-b border-[#F2DED6]/50 hover:bg-[#FDF8F5] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                            >
                              <td className="w-4 p-4">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleLeadSelection(leadKey)}
                                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full ${style.bg} flex items-center justify-center ${style.text} text-xs font-bold border ${style.border} shrink-0`}>
                                    {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 text-sm">{lead.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{lead.title || 'No title'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex flex-col gap-1">
                                  {lead.email && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                      <a href={`mailto:${lead.email}`} className="text-gray-700 hover:text-primary truncate max-w-[180px]" title={lead.email}>
                                        {lead.email}
                                      </a>
                                    </div>
                                  )}
                                  {lead.phone && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span className="text-gray-500 font-mono">{lead.phone}</span>
                                    </div>
                                  )}
                                  {lead.linkedin_url && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                                      <a href={lead.linkedin_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline truncate max-w-[180px]">
                                        LinkedIn
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <div>
                                    <div className="text-sm text-gray-900">{lead.company || '—'}</div>
                                    {lead.company_size && (
                                      <div className="text-xs text-gray-400">{lead.company_size}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-700">{lead.location || '—'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 bg-gray-100 rounded-full h-1.5 border border-gray-200">
                                    <div 
                                      className={`h-1.5 rounded-full ${
                                        lead.confidence > 0.7 ? 'bg-emerald-500' : 
                                        lead.confidence > 0.4 ? 'bg-amber-500' : 'bg-red-400'
                                      }`} 
                                      style={{ width: `${Math.round(lead.confidence * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">{Math.round(lead.confidence * 100)}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                  lead.source?.includes('linkedin') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  lead.source?.includes('maps') ? 'bg-green-50 text-green-700 border-green-200' :
                                  lead.source?.includes('crunchbase') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  lead.source?.includes('apollo') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  {lead.source?.replace('google_', '').replace('_', ' ') || 'web'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
