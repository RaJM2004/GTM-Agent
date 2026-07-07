import { PhoneCall, Play, Mic, Clock, Users } from 'lucide-react';

const calls = [
  { id: 1, prospect: 'Acme Corp', duration: '14:23', date: 'Today, 2:30 PM', agent: 'AI Agent (Sarah)', status: 'Success', sentiment: 'Positive' },
  { id: 2, prospect: 'TechFlow', duration: '05:12', date: 'Today, 11:15 AM', agent: 'AI Agent (John)', status: 'Voicemail', sentiment: 'Neutral' },
  { id: 3, prospect: 'DataSense', duration: '22:45', date: 'Yesterday', agent: 'AI Agent (Sarah)', status: 'Meeting Booked', sentiment: 'Positive' },
  { id: 4, prospect: 'Innovate AI', duration: '01:30', date: 'Yesterday', agent: 'AI Agent (John)', status: 'Not Interested', sentiment: 'Negative' },
];

export default function Calls() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Calls</h1>
          <p className="text-sm text-gray-500">Review recordings, transcripts, and analytics from your AI voice agents.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
            <Mic className="w-4 h-4" /> Configure Agents
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <PhoneCall className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Calls Made</p>
          <p className="text-3xl font-bold text-gray-900">1,245</p>
          <p className="text-xs text-green-600 mt-2 font-medium">+12% this week</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Talk Time</p>
          <p className="text-3xl font-bold text-gray-900">84h 12m</p>
          <p className="text-xs text-green-600 mt-2 font-medium">+5% this week</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Meetings Booked</p>
          <p className="text-3xl font-bold text-gray-900">86</p>
          <p className="text-xs text-green-600 mt-2 font-medium">+24% this week</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#F2DED6] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#F2DED6] bg-[#FDF8F5] flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Recent Call Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-[#F2DED6]">
              <tr>
                <th className="px-6 py-4">Prospect</th>
                <th className="px-6 py-4">Agent</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Outcome</th>
                <th className="px-6 py-4">Recording</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id} className="border-b border-[#F2DED6]/50 hover:bg-[#FDF8F5] transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{call.prospect}</td>
                  <td className="px-6 py-4">{call.agent}</td>
                  <td className="px-6 py-4">{call.duration}</td>
                  <td className="px-6 py-4">{call.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      call.sentiment === 'Positive' ? 'bg-green-50 text-green-700 border-green-200' :
                      call.sentiment === 'Negative' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center text-primary hover:text-primary/80 font-medium transition-colors">
                      <Play className="w-4 h-4 mr-1" /> Listen
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
