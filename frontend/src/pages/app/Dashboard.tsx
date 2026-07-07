import { useState, useEffect } from 'react';
import { Users, CalendarCheck, Megaphone, TrendingUp, Wand2, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_leads: 0,
    meetings_booked: 0,
    active_campaigns: 0,
    conversion_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch('/api/dashboard/stats');
        if (data.status === 'success') {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Banner Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Welcome Banner */}
        <div className="flex-1 bg-white rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center border border-[#F2DED6] shadow-sm">
          {/* Background watermark */}
          <div className="absolute right-0 bottom-0 text-[120px] font-black text-[#F4E5DD] leading-none select-none pointer-events-none -mb-8 -mr-4">
            GTM OS
          </div>
          
          <div className="flex items-center gap-8 relative z-10">
            {/* Robot Image Placeholder */}
            <div className="hidden md:flex shrink-0 w-72 h-72 bg-[#FDF8F5] rounded-xl items-center justify-center shadow-inner overflow-hidden">
              <img 
                src="/gtm_dashboard_illustration.png" 
                alt="AI Outreach Engine Illustration" 
                className="relative z-10 w-full h-full object-cover rounded-xl shadow-2xl group-hover:scale-105 transition-transform duration-500 border border-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-medium text-stone-500">Hi {user?.name || 'Sales Leader'},</h2>
              <h1 className="text-4xl sm:text-5xl font-bold text-[#5A4A42] leading-tight">
                You have a lot to catchup <br />
                <span className="text-primary">with...</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="lg:w-[400px] bg-white rounded-2xl p-8 border border-[#F2DED6] shadow-sm flex flex-col justify-center relative group premium-card-hover">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
            <Wand2 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">AI Outreach Engine</h3>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Intelligent AI agents orchestrating high-converting multi-channel outreach, auto-qualifying leads, and booking meetings directly to your calendar.
          </p>
          <button className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] hover:shadow-[0_6px_20px_rgba(221,138,115,0.23)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 w-max">
            Launch Campaign <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discovery Pipeline Status -> GTM Campaign Performance */}
      <div>
        <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          GTM Campaign Performance
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm premium-card-hover">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Total Leads</span>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {loading ? <span className="text-gray-300 animate-pulse">...</span> : stats.total_leads.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Potential prospects identified.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm premium-card-hover">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Meetings Booked</span>
              <CalendarCheck className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {loading ? <span className="text-gray-300 animate-pulse">...</span> : stats.meetings_booked.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Meetings scheduled this month.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm premium-card-hover">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Active Campaigns</span>
              <Megaphone className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {loading ? <span className="text-gray-300 animate-pulse">...</span> : stats.active_campaigns.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">Ongoing outreach sequences.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm premium-card-hover">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Conversion Rate</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {loading ? <span className="text-gray-300 animate-pulse">...</span> : `${stats.conversion_rate}%`}
            </div>
            <p className="text-xs text-gray-500">from 45,231 emails sent</p>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ongoing Discoveries -> Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#FDF8F5] rounded-xl border border-[#F2DED6]/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="font-semibold text-gray-800">Meeting Booked - Acme Corp</span>
              </div>
              <span className="text-sm font-medium text-gray-500">10 mins ago</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#FDF8F5] rounded-xl border border-[#F2DED6]/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="font-semibold text-gray-800">Campaign Completed - Q3 Enterprise Outreach</span>
              </div>
              <span className="text-sm font-medium text-gray-500">1 hour ago</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[#FDF8F5] rounded-xl border border-[#F2DED6]/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="font-semibold text-gray-800">Lead Qualified - Score &gt; 85</span>
              </div>
              <span className="text-sm font-medium text-gray-500">2 hours ago</span>
            </div>
          </div>
        </div>

        {/* Live System Feed -> Live Activity Feed */}
        <div className="bg-white rounded-2xl p-6 border border-[#F2DED6] shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Live Activity Feed</h3>
          
          <div className="terminal-bg rounded-xl p-4 flex-1 overflow-hidden flex flex-col relative group">
            <div className="absolute top-2 right-3 flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <div className="text-xs space-y-2 mt-4 text-[#E6A291]">
              <p>[11:17:14] <span className="text-[#D47963] font-semibold">EMAIL_SENT:</span> sarah@acme.com</p>
              <p>[11:16:14] <span className="text-[#D47963] font-semibold">LEAD_FOUND:</span> techflow_cto</p>
              <p>[11:15:32] <span className="text-[#D47963] font-semibold">CRM_SYNC:</span> Updating Salesforce...</p>
              <p>[11:15:30] <span className="text-[#D47963] font-semibold">INIT:</span> Campaign sequence started.</p>
              <p className="text-[#E6A291] mt-4 opacity-70 animate-pulse">_ listening for events...</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
