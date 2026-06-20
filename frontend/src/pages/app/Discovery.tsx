import { useState } from 'react';
import { Filter, Download, Plus, Bot, Sparkles, Loader2 } from 'lucide-react';

export default function Discovery() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, max_results: 10 }),
      });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data.leads || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            placeholder='e.g. "Find 100 AI founders with 50+ employees in India"'
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
          <button className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </button>
          <button className="flex items-center px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-sm rounded-lg hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4 mr-2" /> Add to Campaign
          </button>
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
                <th scope="col" className="px-6 py-4">Title</th>
                <th scope="col" className="px-6 py-4">Company</th>
                <th scope="col" className="px-6 py-4">Size</th>
                <th scope="col" className="px-6 py-4">Location</th>
                <th scope="col" className="px-6 py-4">Match Score</th>
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
                  <td className="px-6 py-4">{lead.title}</td>
                  <td className="px-6 py-4">{lead.company}</td>
                  <td className="px-6 py-4">{lead.company_size || 'N/A'}</td>
                  <td className="px-6 py-4">{lead.location}</td>
                  <td className="px-6 py-4">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-semibold">
                      {lead.confidence ? `${Math.round(lead.confidence * 100)}%` : 'N/A'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Searching for leads...' : error ? <span className="text-red-500">{error}</span> : searched ? 'No leads found.' : 'Enter a prompt to discover leads.'}
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
