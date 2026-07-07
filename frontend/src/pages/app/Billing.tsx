import { CreditCard, CheckCircle2, FileText, Zap } from 'lucide-react';

export default function Billing() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-gray-500">Manage your subscription, usage, and billing information.</p>
      </div>

      <div className="bg-white rounded-xl border border-[#F2DED6] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#F2DED6] bg-[#FDF8F5]">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Current Plan: Pro</h2>
              <p className="text-sm text-gray-500 mt-1">You are currently on the Pro plan. Next billing date is Nov 1, 2026.</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">$299</span>
              <span className="text-gray-500">/mo</span>
            </div>
          </div>
        </div>
        <div className="p-6 flex gap-4">
          <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
            Upgrade Plan
          </button>
          <button className="bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
            Cancel Subscription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Payment Method</h3>
            <button className="text-sm text-primary font-medium hover:underline">Update</button>
          </div>
          <div className="flex items-center gap-4 p-4 border border-[#F2DED6] rounded-lg bg-gray-50">
            <div className="w-12 h-8 bg-white rounded border border-gray-200 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Visa ending in 4242</p>
              <p className="text-xs text-gray-500">Expires 12/28</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Usage this month</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Emails Sent</span>
                <span className="font-medium text-gray-900">45k / 50k</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">AI Call Minutes</span>
                <span className="font-medium text-gray-900">850 / 1000</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#F2DED6] shadow-sm">
        <div className="p-6 border-b border-[#F2DED6]">
          <h3 className="font-semibold text-gray-900">Billing History</h3>
        </div>
        <div className="divide-y divide-[#F2DED6]">
          {[
            { date: 'Oct 1, 2026', amount: '$299.00', status: 'Paid' },
            { date: 'Sep 1, 2026', amount: '$299.00', status: 'Paid' },
            { date: 'Aug 1, 2026', amount: '$299.00', status: 'Paid' },
          ].map((invoice, i) => (
            <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Pro Plan - Monthly</p>
                  <p className="text-xs text-gray-500">{invoice.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{invoice.amount}</span>
                <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {invoice.status}
                </span>
                <button className="text-sm text-primary font-medium hover:underline">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
