import { useState, useEffect } from 'react';
import { PhoneCall, Play, Mic, Clock, Users, ChevronDown, ChevronUp, FileText, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CallLog {
  id: string;
  call_id: string;
  lead_name: string;
  lead_phone: string;
  status: string;
  duration: number;
  sentiment: string;
  transcript: string;
  recording_url: string;
  summary: string;
  checklist: string[];
  sms_status: string;
  sms_content: string;
  created_at: string;
  campaign_id: string;
}

interface CallStats {
  total_calls: number;
  total_duration: number;
  meetings_booked: number;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function Calls() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<CallStats>({ total_calls: 0, total_duration: 0, meetings_booked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const userId = user?.user_id || 'user_12345_john_doe';

  const fetchCallData = async () => {
    setIsLoading(true);
    try {
      const [callsRes, statsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/campaigns/voice/calls?user_id=${userId}`),
        fetch(`http://localhost:8000/api/campaigns/voice/stats?user_id=${userId}`),
      ]);
      const callsData = await callsRes.json();
      const statsData = await statsRes.json();

      setCalls(callsData.calls || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch call data:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCallData();
    // Auto-refresh every 15 seconds for live campaign updates
    const interval = setInterval(fetchCallData, 15000);
    return () => clearInterval(interval);
  }, []);

  const sentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-green-50 text-green-700 border-green-200';
      case 'Negative': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ended':
      case 'fulfilled': return 'bg-green-50 text-green-700 border-green-200';
      case 'failed': return 'bg-red-50 text-red-700 border-red-200';
      case 'queued':
      case 'ringing': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Calls</h1>
          <p className="text-sm text-gray-500">Review recordings, transcripts, and analytics from your AI voice agents.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCallData}
            className="bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <PhoneCall className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Calls Made</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total_calls.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Talk Time</p>
          <p className="text-3xl font-bold text-gray-900">{formatTotalDuration(stats.total_duration)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Positive Outcomes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.meetings_booked}</p>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-xl border border-[#F2DED6] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#F2DED6] bg-[#FDF8F5] flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Call Logs</h2>
          <span className="text-xs text-gray-500">{calls.length} calls</span>
        </div>

        {isLoading && calls.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading call logs...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center">
            <PhoneCall className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No calls yet</p>
            <p className="text-xs text-gray-400">Launch a voice campaign from the Campaigns page to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2DED6]/50">
            {calls.map((call) => (
              <div key={call.id || call.call_id} className="transition-colors">
                {/* Call Row */}
                <div
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#FDF8F5] cursor-pointer"
                  onClick={() => setExpandedCall(expandedCall === call.call_id ? null : call.call_id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{call.lead_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{call.lead_phone}</p>
                  </div>

                  <div className="hidden sm:block text-sm text-gray-600 w-20 text-center">
                    {formatDuration(call.duration)}
                  </div>

                  <div className="hidden sm:block text-xs text-gray-500 w-24 text-center">
                    {timeAgo(call.created_at)}
                  </div>

                  <div className="w-24 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(call.status)}`}>
                      {call.status || 'pending'}
                    </span>
                  </div>

                  <div className="w-24 text-center">
                    {call.sentiment && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${sentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {call.recording_url && (
                      <a
                        href={call.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="w-4 h-4 mr-1" /> Listen
                      </a>
                    )}
                    {expandedCall === call.call_id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedCall === call.call_id && (
                  <div className="px-6 pb-5 bg-[#FDF8F5] border-t border-[#F2DED6]/30 space-y-4">
                    {/* Summary */}
                    {call.summary && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Summary
                        </h4>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                          {call.summary}
                        </p>
                      </div>
                    )}

                    {/* Checklist */}
                    {call.checklist && call.checklist.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Action Items</h4>
                        <ul className="space-y-1">
                          {call.checklist.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200 flex items-start gap-2">
                              <span className="text-primary font-semibold">{idx + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Transcript */}
                    {call.transcript && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Transcript</h4>
                        <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                          {call.transcript}
                        </div>
                      </div>
                    )}

                    {/* Follow-up SMS */}
                    {call.sms_status && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> Follow-up SMS
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${call.sms_status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {call.sms_status}
                          </span>
                        </h4>
                        {call.sms_content && (
                          <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                            {call.sms_content}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
