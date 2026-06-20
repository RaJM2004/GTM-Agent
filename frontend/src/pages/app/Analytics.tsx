import { BarChart3, LineChart as LineChartIcon, PieChart, Download } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-gray-500">Analyze your campaign performance and conversion metrics.</p>
        </div>
        <button className="bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm flex flex-col h-64">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Email Open Rate</h3>
            <LineChartIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {/* Placeholder for actual chart */}
            <div className="text-center">
              <span className="text-4xl font-bold text-gray-900">42.5%</span>
              <p className="text-sm text-green-600 mt-2 font-medium">+5.2% from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm flex flex-col h-64">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Meetings Booked</h3>
            <BarChart3 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl font-bold text-gray-900">142</span>
              <p className="text-sm text-green-600 mt-2 font-medium">+12 from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm flex flex-col h-64">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Channel Distribution</h3>
            <PieChart className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <span className="text-sm text-gray-600 w-16">65% Email</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
              <span className="text-sm text-gray-600 w-16">25% LinkedIn</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
              <span className="text-sm text-gray-600 w-16">10% Calls</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between text-center">
          <div className="flex-1 bg-[#FDF8F5] border border-[#F2DED6] p-6 rounded-xl w-full">
            <p className="text-sm text-gray-500 mb-2">Total Leads Reached</p>
            <p className="text-3xl font-bold text-gray-900">45,231</p>
          </div>
          <div className="hidden md:block w-8 h-px bg-gray-300"></div>
          <div className="flex-1 bg-[#FDF8F5] border border-[#F2DED6] p-6 rounded-xl w-full">
            <p className="text-sm text-gray-500 mb-2">Replies Received</p>
            <p className="text-3xl font-bold text-gray-900">3,842</p>
            <p className="text-xs text-primary font-medium mt-1">8.5% conversion</p>
          </div>
          <div className="hidden md:block w-8 h-px bg-gray-300"></div>
          <div className="flex-1 bg-[#FDF8F5] border border-[#F2DED6] p-6 rounded-xl w-full">
            <p className="text-sm text-gray-500 mb-2">Meetings Booked</p>
            <p className="text-3xl font-bold text-gray-900">415</p>
            <p className="text-xs text-primary font-medium mt-1">10.8% conversion</p>
          </div>
        </div>
      </div>
    </div>
  );
}
