import { CreditCard, CheckCircle2, FileText, Zap, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

export default function Billing() {
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const data = await apiFetch('/api/v1/auth/billing');
        setBillingData(data);
      } catch (err) {
        console.error("Failed to load billing data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const { billing_plan, credits_used, credits_limit, billing_cycle_reset } = billingData || {};
  
  const resetDate = billing_cycle_reset ? new Date(billing_cycle_reset).toLocaleDateString() : 'Next Month';

  const usageStats = [
    { label: "Emails Sent", key: "emails_sent", color: "bg-primary" },
    { label: "SMS Sent", key: "sms_sent", color: "bg-orange-500" },
    { label: "AI Leads Discovered", key: "ai_leads_discovered", color: "bg-blue-500" },
    { label: "AI Personalizations", key: "ai_personalizations", color: "bg-purple-500" },
    { label: "LinkedIn Posts", key: "linkedin_posts", color: "bg-emerald-500" }
  ];

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
              <h2 className="text-lg font-bold text-gray-900">Current Plan: {billing_plan}</h2>
              <p className="text-sm text-gray-500 mt-1">You are currently on the {billing_plan} plan. Next billing cycle resets on {resetDate}.</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">₹24,999</span>
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
          <h3 className="font-semibold text-gray-900 mb-6">Live Usage this month</h3>
          <div className="space-y-4">
            {usageStats.map(stat => {
              const used = credits_used?.[stat.key] || 0;
              const limit = credits_limit?.[stat.key] || 0;
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              return (
                <div key={stat.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{stat.label}</span>
                    <span className="font-medium text-gray-900">{used} / {limit}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${stat.color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#F2DED6] shadow-sm">
        <div className="p-6 border-b border-[#F2DED6]">
          <h3 className="font-semibold text-gray-900">Billing History</h3>
        </div>
        <div className="divide-y divide-[#F2DED6]">
          {[
            { date: 'Oct 1, 2026', amount: '₹24,999.00', status: 'Paid' },
            { date: 'Sep 1, 2026', amount: '₹24,999.00', status: 'Paid' },
            { date: 'Aug 1, 2026', amount: '₹24,999.00', status: 'Paid' },
          ].map((invoice, i) => (
            <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{billing_plan} Plan - Monthly</p>
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
