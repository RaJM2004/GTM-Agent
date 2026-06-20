import { useState } from 'react';
import { Search, Filter, Plus, MoreHorizontal, UserCircle, Building2, Phone, Mail } from 'lucide-react';

const leads = [
  { id: 1, name: 'Alex Thompson', role: 'VP Sales', company: 'CloudScale', status: 'Hot', score: 95, lastContact: '2 hours ago' },
  { id: 2, name: 'Sarah Chen', role: 'CEO', company: 'InnovateTech', status: 'Warm', score: 82, lastContact: '1 day ago' },
  { id: 3, name: 'Marcus Rodriguez', role: 'Director of RevOps', company: 'GrowthDynamics', status: 'Cold', score: 45, lastContact: '1 week ago' },
  { id: 4, name: 'Jessica Kim', role: 'Head of Marketing', company: 'NextGen Solutions', status: 'New', score: 78, lastContact: 'Never' },
];

export default function Leads() {
  const [activeTab, setActiveTab] = useState('All Leads');

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Management</h1>
          <p className="text-sm text-gray-500">Track and manage your prospects through the sales pipeline.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white border border-[#F2DED6] rounded-lg p-1 shadow-sm overflow-x-auto hide-scrollbar w-full sm:w-auto">
          {['All Leads', 'New', 'Hot', 'Warm', 'Cold'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-[#FDF8F5] text-primary shadow-sm border border-[#F2DED6]' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-[#F2DED6] overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-[#FDF8F5] border-b border-[#F2DED6]">
              <tr>
                <th scope="col" className="p-4 w-12"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></th>
                <th scope="col" className="px-6 py-4">Lead Info</th>
                <th scope="col" className="px-6 py-4">Company</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">AI Score</th>
                <th scope="col" className="px-6 py-4">Last Contact</th>
                <th scope="col" className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[#F2DED6]/50 hover:bg-[#FDF8F5] transition-colors cursor-pointer">
                  <td className="w-4 p-4"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold border border-primary/20 shrink-0">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{lead.name}</div>
                        <div className="text-xs text-gray-500">{lead.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {lead.company}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      lead.status === 'Hot' ? 'bg-red-50 text-red-700 border-red-200' :
                      lead.status === 'Warm' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      lead.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 w-16 border border-gray-200">
                        <div className={`h-1.5 rounded-full ${lead.score > 80 ? 'bg-green-500' : lead.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${lead.score}%` }}></div>
                      </div>
                      <span className="font-medium text-gray-900">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{lead.lastContact}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
