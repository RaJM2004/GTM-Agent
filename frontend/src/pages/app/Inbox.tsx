import { useState } from 'react';
import { Search, Mail, MessageSquare, PhoneCall, Filter, Star, Clock, MoreVertical, Reply, Send, Paperclip } from 'lucide-react';

const threads = [
  { id: 1, name: 'Sarah Jenkins', company: 'Acme Corp', subject: 'Re: Q3 Enterprise Outreach', preview: 'Yes, I would be interested in seeing a demo next week.', time: '10:42 AM', unread: true, channel: 'email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 2, name: 'Michael Chen', company: 'TechFlow', subject: 'LinkedIn Connection', preview: 'Thanks for reaching out! Let\'s connect and discuss the AI initiatives.', time: '09:15 AM', unread: true, channel: 'linkedin', icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 3, name: 'Emma Watson', company: 'DataSense', subject: 'Follow up call', preview: 'Missed call from +1 (555) 019-2834. Left a voicemail.', time: 'Yesterday', unread: false, channel: 'call', icon: PhoneCall, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 4, name: 'David Miller', company: 'Innovate AI', subject: 'WhatsApp Message', preview: 'The proposal looks good. Can you send the final agreement?', time: 'Yesterday', unread: false, channel: 'whatsapp', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 5, name: 'Lisa Kumar', company: 'ScaleUp', subject: 'Re: Quick question about Genquantaa', preview: 'I am currently evaluating tools. What is your pricing model?', time: 'Oct 15', unread: false, channel: 'email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50' },
];

export default function Inbox() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedThread, setSelectedThread] = useState(threads[0]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#F2DED6] bg-white flex justify-between items-center z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Unified Inbox</h1>
          <p className="text-sm text-gray-500">Manage emails, LinkedIn, calls, and WhatsApp in one place.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
      </div>

      {/* Main Inbox Container */}
      <div className="flex flex-1 overflow-hidden bg-[#FAF9F6]">
        
        {/* Left Panel: Thread List */}
        <div className="w-full md:w-[350px] lg:w-[400px] border-r border-[#F2DED6] bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-[#F2DED6] space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full bg-[#FDF8F5] border border-[#F2DED6] rounded-lg py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {['All', 'Unread', 'Emails', 'LinkedIn', 'Calls'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-white text-gray-600 border border-[#F2DED6] hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Threads */}
          <div className="flex-1 overflow-y-auto">
            {threads.map((thread) => (
              <div 
                key={thread.id} 
                onClick={() => setSelectedThread(thread)}
                className={`p-4 border-b border-[#F2DED6]/50 cursor-pointer hover:bg-[#FDF8F5] transition-colors relative ${selectedThread.id === thread.id ? 'bg-[#FDF8F5]' : ''}`}
              >
                {selectedThread.id === thread.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                )}
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-md ${thread.bg} ${thread.color}`}>
                      <thread.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className={`font-semibold text-sm ${thread.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {thread.name}
                    </span>
                  </div>
                  <span className={`text-xs ${thread.unread ? 'text-primary font-bold' : 'text-gray-400'}`}>
                    {thread.time}
                  </span>
                </div>
                <div className="pl-8">
                  <p className="text-xs font-medium text-gray-900 mb-0.5 truncate">{thread.subject}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{thread.preview}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Message View */}
        <div className="hidden md:flex flex-1 flex-col bg-white">
          {/* Message Header */}
          <div className="p-6 border-b border-[#F2DED6] flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold border border-primary/20 shrink-0">
                {selectedThread.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedThread.name}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{selectedThread.company}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="flex items-center gap-1">
                    <selectedThread.icon className="w-3.5 h-3.5" />
                    {selectedThread.channel.charAt(0).toUpperCase() + selectedThread.channel.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 text-gray-400">
              <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><Star className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><Clock className="w-5 h-5" /></button>
              <button className="p-2 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Message Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">{selectedThread.subject}</h3>
              
              <div className="bg-[#FDF8F5] border border-[#F2DED6]/50 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-900">{selectedThread.name}</span>
                  <span className="text-xs text-gray-500">{selectedThread.time}</span>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed space-y-4">
                  <p>Hi Sales Leader,</p>
                  <p>{selectedThread.preview}</p>
                  <p>Could you share some available times for tomorrow? I'd love to loop my CTO in as well so we can evaluate the full technical stack of Genquantaa.</p>
                  <p>Best regards,<br/>{selectedThread.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reply Box */}
          <div className="p-4 border-t border-[#F2DED6] bg-[#f8f9fa]">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-[#F2DED6] rounded-xl overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <textarea 
                  rows={4} 
                  placeholder="Type your reply..." 
                  className="w-full p-4 text-sm text-gray-900 placeholder-gray-400 border-none outline-none resize-none"
                ></textarea>
                <div className="flex justify-between items-center p-3 bg-gray-50 border-t border-[#F2DED6]">
                  <div className="flex gap-1">
                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"><Reply className="w-4 h-4" /></button>
                  </div>
                  <button className="flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm gap-2">
                    Send Reply <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
