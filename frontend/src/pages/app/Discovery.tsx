import { useState } from 'react';
import { Filter, Download, Plus, Bot, Sparkles, Loader2, Mail, Phone, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Helper: extract requested count from prompt
function extractCountFromPrompt(prompt: string): number {
  const match = prompt.match(/(\d+)\s*(?:leads?|people|founders?|ctos?|ceos?|contacts?|professionals?|directors?|managers?)/i);
  if (match) return Math.min(parseInt(match[1], 10), 200);
  // Also check for "find <number>"
  const findMatch = prompt.match(/find\s+(\d+)/i);
  if (findMatch) return Math.min(parseInt(findMatch[1], 10), 200);
  return 50;
}

// ICP Score badge component
function IcpBadge({ score, reasoning }: { score: number | null; reasoning?: string }) {
  if (score === null || score === undefined) {
    return <span className="text-gray-400 text-xs italic">Not scored</span>;
  }
  const pct = Math.round(score);
  let color = 'bg-red-100 text-red-700 border-red-200';
  let Icon = XCircle;
  let label = 'Poor';
  if (pct >= 80) { color = 'bg-emerald-100 text-emerald-700 border-emerald-200'; Icon = CheckCircle2; label = 'Excellent'; }
  else if (pct >= 60) { color = 'bg-blue-100 text-blue-700 border-blue-200'; Icon = ShieldCheck; label = 'Good'; }
  else if (pct >= 40) { color = 'bg-amber-100 text-amber-700 border-amber-200'; Icon = AlertTriangle; label = 'Fair'; }

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
  const { user } = useAuth();
  const [query, setQuery] = useState('');
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
      const res = await fetch('http://localhost:8000/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, max_results: requestedCount, user_id: currentUserId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to fetch leads');
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreICP = async () => {
    if (leads.length === 0) return;
    setScoring(true);
    try {
      const res = await fetch('http://localhost:8000/api/discovery/score-icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, original_query: query }),
      });
      if (!res.ok) throw new Error('ICP scoring failed');
      const data = await res.json();
      // Merge scores back into leads
      const scoredLeads = leads.map((lead, idx) => ({
        ...lead,
        icp_score: data.scores?.[idx]?.score ?? null,
        icp_reasoning: data.scores?.[idx]?.reasoning ?? '',
      }));
      // Sort by ICP score descending
      scoredLeads.sort((a: any, b: any) => (b.icp_score ?? 0) - (a.icp_score ?? 0));
      setLeads(scoredLeads);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Lead Discovery</h1>
        <p className="text-sm text-gray-500">Find your ideal ICP using natural language search.</p>
      </div>

      {/* AI Search Bar */}
      <div className="bg-[#FDF8F5] rounded-2xl p-2 border border-[#F2DED6] shadow-sm">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-4 w-5 h-5 text-primary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='e.g. "Find 50 AI founders with 50+ employees in Hyderabad"'
            className="w-full bg-transparent border-none py-4 pl-12 pr-32 text-gray-900 placeholder-gray-400 focus:ring-0 text-lg outline-none"
          />
          <button 
            onClick={handleSearch}
            disabled={loading || !query}
            className="absolute right-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate'}
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
            <option>Industry</option>
            <option>Software</option>
            <option>Healthcare</option>
            <option>Finance</option>
          </select>
          <select className="bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none">
            <option>Company Size</option>
            <option>1-10</option>
            <option>11-50</option>
            <option>51-200</option>
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
              className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm rounded-lg transition-all shadow-sm font-medium disabled:opacity-50">
              {scoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {scoring ? 'Scoring...' : 'Score ICP'}
            </button>
          )}
          <button 
            onClick={() => {
              if (leads.length === 0) return;
              const headers = ['Name','Title','Company','Email','Phone','LinkedIn','Website','Location','Industry','Confidence'];
              const rows = leads.map((l: any) => [l.name,l.title,l.company,l.email,l.phone,l.linkedin_url||'',l.website||'',l.location,l.industry||'',l.confidence||''].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `discovery_leads_${new Date().toISOString().slice(0,10)}.csv`;
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
            <Plus className="w-4 h-4 mr-2" /> View in Lead Manager
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
                <th scope="col" className="px-6 py-4">Prospect</th>
                <th scope="col" className="px-6 py-4">Contact Info</th>
                <th scope="col" className="px-6 py-4">Title</th>
                <th scope="col" className="px-6 py-4">Company</th>
                <th scope="col" className="px-6 py-4">Location</th>
                <th scope="col" className="px-6 py-4">ICP Score</th>
                <th scope="col" className="px-6 py-4">Data Quality</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? leads.map((lead, idx) => (
                <tr key={idx} className="border-b border-[#F2DED6]/50 hover:bg-[#FDF8F5] transition-colors">
                  <td className="w-4 p-4">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs border border-primary/20 font-bold">
                      {lead.name ? lead.name.charAt(0) : '?'}
                    </div>
                    {lead.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {lead.email ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-900 font-medium truncate max-w-[200px]" title={lead.email}>
                            {lead.email}
                          </span>
                        </div>
                      ) : null}
                      {lead.phone ? (
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 font-mono">
                            {lead.phone}
                          </span>
                        </div>
                      ) : null}
                      {!lead.email && !lead.phone && (
                        <span className="text-gray-400 text-sm italic">No contact info</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{lead.title}</td>
                  <td className="px-6 py-4">{lead.company}</td>
                  <td className="px-6 py-4">{lead.location}</td>
                  <td className="px-6 py-4">
                    <IcpBadge score={lead.icp_score ?? null} reasoning={lead.icp_reasoning} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-semibold">
                      {lead.confidence ? `${Math.round(lead.confidence * 100)}%` : 'N/A'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-gray-600 font-medium">Scraping the web for leads...</span>
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
                      'No leads found. Try broadening your search.'
                    ) : (
                      'Enter a prompt to discover leads.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[#F2DED6] flex items-center justify-between mt-auto bg-[#FDF8F5]">
          <span className="text-sm text-gray-500">
            {leads.length > 0 ? `Showing 1 to ${leads.length} of ${leads.length} leads` : ''}
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
