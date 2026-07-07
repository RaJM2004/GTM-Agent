import { useState } from 'react';
import { Plus, FileText, Mail, MessageSquare, Search, Copy, Edit2, Trash2 } from 'lucide-react';

const templates = [
  { id: 1, name: 'Cold Outreach v1', channel: 'Email', uses: 1240, replyRate: '12.4%', lastEdited: '2 days ago' },
  { id: 2, name: 'LinkedIn Connection Request', channel: 'LinkedIn', uses: 850, replyRate: '24.1%', lastEdited: '1 week ago' },
  { id: 3, name: 'Follow up - No Response', channel: 'Email', uses: 532, replyRate: '8.2%', lastEdited: '3 days ago' },
  { id: 4, name: 'WhatsApp Intro', channel: 'WhatsApp', uses: 120, replyRate: '45.0%', lastEdited: 'Just now' },
];

export default function Templates() {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Templates</h1>
          <p className="text-sm text-gray-500">Manage your messaging templates across all channels.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-white border border-[#F2DED6] rounded-lg p-1 shadow-sm w-full sm:w-auto overflow-x-auto">
          {['All', 'Email', 'LinkedIn', 'WhatsApp'].map((tab) => (
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-[#F2DED6] shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-all">
            <div className="p-5 border-b border-[#F2DED6] flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${
                  template.channel === 'Email' ? 'bg-blue-50 text-blue-500' :
                  template.channel === 'LinkedIn' ? 'bg-indigo-50 text-indigo-500' :
                  'bg-emerald-50 text-emerald-500'
                }`}>
                  {template.channel === 'Email' && <Mail className="w-5 h-5" />}
                  {template.channel === 'LinkedIn' && <MessageSquare className="w-5 h-5" />}
                  {template.channel === 'WhatsApp' && <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-gray-400 hover:text-primary bg-white hover:bg-primary/10 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-1.5 text-gray-400 hover:text-primary bg-white hover:bg-primary/10 rounded-md transition-colors"><Copy className="w-4 h-4" /></button>
                  <button className="p-1.5 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-3">
                Hi {"{{first_name}}"}, I noticed you recently joined {"{{company_name}}"} and wanted to reach out regarding your sales infrastructure...
              </p>
            </div>
            <div className="bg-[#FAF9F6] p-4 flex justify-between items-center text-xs text-gray-500">
              <div className="flex gap-4">
                <span><strong className="text-gray-900">{template.uses}</strong> sends</span>
                <span><strong className="text-gray-900">{template.replyRate}</strong> replies</span>
              </div>
              <span>{template.lastEdited}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
