import { useState } from 'react';
import { Plus, MoreVertical, Play, Pause, Search, Calendar, PhoneCall, Mail, Share2, MessageCircle } from 'lucide-react';

const mockCampaigns = [
  { id: 1, name: 'Q3 Enterprise Outreach', status: 'Active', type: 'Email', progress: 65, sent: 1245, replied: 84, booked: 12, date: 'Oct 12, 2026', icon: Mail },
  { id: 2, name: 'AI Founders Qualification', status: 'Active', type: 'Call', progress: 40, sent: 300, replied: 45, booked: 8, date: 'Oct 10, 2026', icon: PhoneCall },
  { id: 3, name: 'Healthcare Leads Nurture', status: 'Paused', type: 'LinkedIn', progress: 15, sent: 150, replied: 12, booked: 1, date: 'Oct 05, 2026', icon: Share2 },
  { id: 4, name: 'Follow up - Webinar', status: 'Draft', type: 'WhatsApp', progress: 0, sent: 0, replied: 0, booked: 0, date: 'Oct 15, 2026', icon: MessageCircle },
];

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState('All');

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500">Manage and monitor your automated multi-channel outreach.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
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
        {mockCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white hover:bg-gray-50 rounded-xl p-5 border border-[#F2DED6] shadow-sm flex flex-col md:flex-row items-center gap-6 transition-colors">
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
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
    </div>
  );
}
