import { useState } from 'react';
import { Filter, Download, Plus, Bot, Sparkles, Loader2, Mail, Phone, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

// Helper: extract requested count from prompt
function extractCountFromPrompt(prompt: string): number {
  const match = prompt.match(/(\d+)\s*(?:leads?|people|founders?|ctos?|ceos?|contacts?|professionals?|directors?|managers?|candidates?|developers?)/i);
  if (match) return Math.min(parseInt(match[1], 10), 200);
  // Also check for "find <number>"
  const findMatch = prompt.match(/find\s+(\d+)/i);
  if (findMatch) return Math.min(parseInt(findMatch[1], 10), 200);
  return 50;
}

// ICP / JD Score badge component
function IcpBadge({ score, reasoning, isHr }: { score: number | null; reasoning?: string; isHr?: boolean }) {
  if (score === null || score === undefined) {
    return <span className="text-gray-400 text-xs italic">Not scored</span>;
  }
  const pct = Math.round(score);
  let color = 'bg-red-100 text-red-700 border-red-200';
  let Icon = XCircle;
  let label = 'Poor Match';
  if (pct >= 80) { color = 'bg-emerald-100 text-emerald-700 border-emerald-200'; Icon = CheckCircle2; label = isHr ? 'Strong Match' : 'Excellent'; }
  else if (pct >= 60) { color = 'bg-blue-100 text-blue-700 border-blue-200'; Icon = ShieldCheck; label = isHr ? 'Good Fit' : 'Good'; }
  else if (pct >= 40) { color = 'bg-amber-100 text-amber-700 border-amber-200'; Icon = AlertTriangle; label = isHr ? 'Partial Match' : 'Fair'; }

  return (
    <div className="flex flex-col items-center gap-1" title={reasoning || ''}>
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {pct}%
      </span>
      <span className={`text-[10px] font-medium ${color.includes('emerald') ? 'text-emerald-600' : color.includes('blue') ? 'text-blue-600' : color.includes('amber') ? 'text-amber-600' : 'text-red-600'}`}>{label}</span>
    </div>
  );
}

export default function Discovery() {
  const { user, checkSession } = useAuth();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'lead' | 'hr'>('lead');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    const requestedCount = extractCountFromPrompt(query);
    try {
      const currentUserId = user?.user_id || 'user_12345_john_doe';
      const data = await apiFetch('/api/discovery/search', {
        method: 'POST',
        bodyData: { 
          prompt: query, 
          max_results: requestedCount, 
          user_id: currentUserId,
          search_mode: searchMode 
        },
      });
      setLeads(data.leads || []);
      setSearched(true);
      checkSession();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreICP = async () => {
    if (leads.length === 0) return;
    setScoring(true);
    try {
      const data = await apiFetch('/api/discovery/score-icp', {
        method: 'POST',
        bodyData: { leads, original_query: query, user_id: user?.user_id },
      });
      // Merge scores back into leads
      const scoredLeads = leads.map((lead, idx) => ({
        ...lead,
        icp_score: data.scores?.[idx]?.score ?? lead.match_score ?? null,
        icp_reasoning: data.scores?.[idx]?.reasoning ?? '',
      }));
      // Sort by score descending
      scoredLeads.sort((a: any, b: any) => (b.icp_score ?? 0) - (a.icp_score ?? 0));
      setLeads(scoredLeads);
      checkSession();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {searchMode === 'hr' ? 'HR Candidate & Resume Sourcing' : 'AI Lead Discovery'}
        </h1>
        <p className="text-sm text-gray-500">
          {searchMode === 'hr' 
            ? 'Scrape and match candidates from Dice, Indeed, ZipRecruiter, and LinkedIn with resumes.' 
            : 'Find your ideal sales ICP using natural language search.'}
        </p>
      </div>

      {/* Mode Switcher + Search Container */}
      <div className="bg-[#FDF8F5] rounded-2xl p-4 border border-[#F2DED6] shadow-sm space-y-3">
        {/* Toggle Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-white rounded-xl border border-[#F2DED6] shadow-sm">
            <button
              type="button"
              onClick={() => { setSearchMode('lead'); setLeads([]); setSearched(false); }}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                searchMode === 'lead'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4" />
              B2B Sales Leads
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('hr'); setLeads([]); setSearched(false); }}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                searchMode === 'hr'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              HR Candidate Search (Dice, Indeed, ZipRecruiter)
            </button>
          </div>

          {searchMode === 'hr' && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <span className="text-gray-400">Sources:</span>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Dice</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Indeed</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">ZipRecruiter</span>
              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">LinkedIn</span>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="relative flex items-center bg-white rounded-xl border border-[#F2DED6] shadow-sm">
          {searchMode === 'hr' ? (
            <Briefcase className="absolute left-4 w-5 h-5 text-orange-500" />
          ) : (
            <Sparkles className="absolute left-4 w-5 h-5 text-primary" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={
              searchMode === 'hr'
                ? 'Enter Job Description or Role: e.g. "Senior React & Node.js Developer in Austin with 5+ years exp"'
                : 'e.g. "Find 50 AI founders with 50+ employees in Hyderabad"'
            }
            className="w-full bg-transparent border-none py-4 pl-12 pr-36 text-gray-900 placeholder-gray-400 focus:ring-0 text-base sm:text-lg outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query}
            className={`absolute right-2 px-6 py-2 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 ${
              searchMode === 'hr' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Searching...' : searchMode === 'hr' ? 'Find Candidates' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Conversational AI Chat Bubble */}
      {error && error.startsWith('Sir,') && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] shadow-sm ml-4 mr-12">
          <div className="bg-blue-600 p-2 rounded-full shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">AI Assistant</h3>
            <p className="text-blue-800 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2">
          <select className="bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none">
            <option>{searchMode === 'hr' ? 'All Experience Levels' : 'Industry'}</option>
            <option>Software / IT</option>
            <option>Healthcare</option>
            <option>Finance</option>
          </select>
          <select className="bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none">
            <option>{searchMode === 'hr' ? 'All Job Platforms' : 'Company Size'}</option>
            <option>Dice</option>
            <option>Indeed</option>
            <option>ZipRecruiter</option>
            <option>LinkedIn</option>
          </select>
          <button className="flex items-center px-3 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" /> More Filters
          </button>
        </div>

        <div className="flex gap-2">
          {leads.length > 0 && (
            <button
              onClick={handleScoreICP}
              disabled={scoring}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm rounded-lg transition-all shadow-sm font-medium disabled:opacity-50"
            >
              {scoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {scoring ? 'Scoring...' : searchMode === 'hr' ? 'Score JD Match' : 'Score ICP'}
            </button>
          )}
          <button
            onClick={() => {
              if (leads.length === 0) return;
              const headers = ['Name', 'Title', 'Company/Platform', 'Skills', 'Resume/Profile', 'Email', 'Phone', 'Location', 'Match Score'];
              const rows = leads.map((l: any) => [
                l.name, l.title, l.platform_source || l.company, (l.skills || []).join('; '), l.resume_url || l.linkedin_url || l.website || '', l.email, l.phone, l.location, l.match_score || l.icp_score || ''
              ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `candidate_discovery_${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={leads.length === 0}
            className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
          <a
            href="/app/leads"
            className="flex items-center px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-sm rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> View in Manager
          </a>
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 bg-white rounded-xl border border-[#F2DED6] overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-[#FDF8F5] border-b border-[#F2DED6]">
              <tr>
                <th scope="col" className="p-4">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                </th>
                <th scope="col" className="px-6 py-4">{searchMode === 'hr' ? 'Candidate' : 'Prospect'}</th>
                <th scope="col" className="px-6 py-4">{searchMode === 'hr' ? 'Role & Skills' : 'Contact Info'}</th>
                <th scope="col" className="px-6 py-4">{searchMode === 'hr' ? 'Platform Source' : 'Title'}</th>
                <th scope="col" className="px-6 py-4">{searchMode === 'hr' ? 'Resume / Profile' : 'Company'}</th>
                <th scope="col" className="px-6 py-4">Contact Details</th>
                <th scope="col" className="px-6 py-4">{searchMode === 'hr' ? 'JD Match Score' : 'ICP Score'}</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? leads.map((lead, idx) => (
                <tr key={idx} className="border-b border-[#F2DED6]/50 hover:bg-[#FDF8F5] transition-colors">
                  <td className="w-4 p-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  </td>
                  
                  {/* Name */}
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs border border-primary/20 font-bold shrink-0">
                      {lead.name ? lead.name.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{lead.name}</div>
                      {lead.location && <div className="text-xs text-gray-400">{lead.location}</div>}
                    </div>
                  </td>

                  {/* Role & Skills (HR) or Contact Info (Lead) */}
                  <td className="px-6 py-4">
                    {searchMode === 'hr' || lead.is_hr_candidate ? (
                      <div className="space-y-1.5 max-w-xs">
                        <div className="font-semibold text-gray-800 text-sm">{lead.title}</div>
                        {lead.skills && lead.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lead.skills.map((sk: string, sIdx: number) => (
                              <span key={sIdx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-medium border border-gray-200">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {lead.email ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-900 font-medium truncate max-w-[150px]" title={lead.email}>
                              {lead.email}
                            </span>
                            {lead.is_verified && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1 whitespace-nowrap">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        ) : null}
                        {lead.phone ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-500 font-mono">{lead.phone}</span>
                          </div>
                        ) : null}
                        {!lead.email && !lead.phone && (
                          <span className="text-gray-400 text-xs italic">No contact details</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Platform Source (HR) or Title (Lead) */}
                  <td className="px-6 py-4">
                    {searchMode === 'hr' || lead.is_hr_candidate ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        (lead.platform_source || '').toLowerCase().includes('dice') 
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : (lead.platform_source || '').toLowerCase().includes('indeed')
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : (lead.platform_source || '').toLowerCase().includes('ziprecruiter')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {lead.platform_source || 'Dice / Job Board'}
                      </span>
                    ) : (
                      lead.title
                    )}
                  </td>

                  {/* Resume Link (HR) or Company (Lead) */}
                  <td className="px-6 py-4">
                    {searchMode === 'hr' || lead.is_hr_candidate ? (
                      lead.resume_url || lead.website || lead.linkedin_url ? (
                        <a
                          href={lead.resume_url || lead.website || lead.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Resume
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No link</span>
                      )
                    ) : (
                      lead.company
                    )}
                  </td>

                  {/* Contact Details Column */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 text-gray-800">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[130px] font-mono">{lead.email}</span>
                        </div>
                      ) : null}
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="font-mono">{lead.phone}</span>
                        </div>
                      ) : null}
                      {!lead.email && !lead.phone && (
                        <span className="text-gray-400 text-xs italic">Website Profile</span>
                      )}
                    </div>
                  </td>

                  {/* JD Match Score (HR) or ICP Score (Lead) */}
                  <td className="px-6 py-4">
                    <IcpBadge 
                      score={lead.icp_score ?? lead.match_score ?? null} 
                      reasoning={lead.icp_reasoning} 
                      isHr={searchMode === 'hr'} 
                    />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-gray-600 font-medium">
                          {searchMode === 'hr' ? 'Scraping Dice, Indeed & ZipRecruiter for candidates...' : 'Scraping the web for leads...'}
                        </span>
                      </div>
                    ) : error ? (
                      error.startsWith('Sir,') ? (
                        <div className="flex flex-col items-center gap-2">
                          <Bot className="w-6 h-6 text-blue-500" />
                          <span className="text-blue-600 font-medium">Waiting for your reply...</span>
                        </div>
                      ) : (
                        <span className="text-red-500">{error}</span>
                      )
                    ) : searched ? (
                      'No results found. Try broadening your criteria.'
                    ) : (
                      searchMode === 'hr' 
                        ? 'Enter a Job Description or role to discover matching candidates with resumes.'
                        : 'Enter a prompt to discover B2B sales leads.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[#F2DED6] flex items-center justify-between mt-auto bg-[#FDF8F5]">
          <span className="text-sm text-gray-500">
            {leads.length > 0 ? `Showing 1 to ${leads.length} of ${leads.length} results` : ''}
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-[#F2DED6] rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">Previous</button>
            <button className="px-3 py-1 bg-white border border-[#F2DED6] rounded text-sm text-gray-700 hover:bg-gray-50 shadow-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
