import { CreditCard, CheckCircle2, FileText, Zap, Loader2, Coins, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function Billing() {
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const { updateUser } = useAuth();

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const data = await apiFetch('/api/v1/auth/billing');
        setBillingData(data);
        if (data && data.token_balance !== undefined) {
          updateUser({ token_balance: data.token_balance });
        }
      } catch (err) {
        console.error("Failed to load billing data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handleBuyTokens = async (packageId: string) => {
    setBuying(true);
    try {
      const data = await apiFetch('/api/v1/payments/create-order', {
        method: 'POST',
        bodyData: { package_id: packageId }
      });
      if (data.payment_session_id) {
        alert(`Cashfree payment session created! ID: ${data.payment_session_id}. In a real app, you would be redirected to Cashfree now.`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initiate payment");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const { token_balance, trial_ends_at, trial_active } = billingData || {};

  const trialDaysLeft = trial_ends_at ? Math.max(0, Math.ceil((new Date(trial_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Tokens</h1>
        <p className="text-sm text-gray-500">Manage your token balance, subscriptions, and payment methods.</p>
      </div>

      {trial_active && trialDaysLeft > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <Clock className="w-6 h-6 text-orange-500" />
          <div>
            <h3 className="font-bold text-orange-900">14-Day Free Trial Active</h3>
            <p className="text-sm text-orange-800">You have {trialDaysLeft} days remaining in your free trial. Enjoy full access to all AI capabilities.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#F2DED6] shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div className="p-8 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#F2DED6] bg-[#FDF8F5]">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-yellow-500" /> Available Token Balance
          </h2>
          <div className="text-5xl font-black text-gray-900 tracking-tight">
            {token_balance?.toLocaleString() || 0}
          </div>
          <p className="text-sm text-gray-500 mt-2">Tokens are consumed based on the AI models and channels you use.</p>
        </div>

        <div className="p-8 md:w-1/2">
          <h3 className="font-semibold text-gray-900 mb-4">Recharge Tokens</h3>
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-start hover:border-primary transition-colors cursor-pointer group">
              <div>
                <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">1 Million Tokens</p>
                <p className="text-sm text-gray-500 mb-2">Great for getting started</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 10,000 Emails / SMS</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 1,600 LinkedIn Posts</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 100 Voice Call Mins</li>
                </ul>
              </div>
              <button
                disabled={buying}
                onClick={() => handleBuyTokens('bundle_1M')}
                className="bg-primary text-white px-4 py-2 rounded font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 h-fit mt-1"
              >
                ₹1,000
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-start hover:border-primary transition-colors cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">SAVE 20%</div>
              <div>
                <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">5 Million Tokens</p>
                <p className="text-sm text-gray-500 mb-2">For scaling revenue teams</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 50,000 Emails / SMS</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 8,000 LinkedIn Posts</li>
                  <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-primary" /> ~ 500 Voice Call Mins</li>
                </ul>
              </div>
              <button
                disabled={buying}
                onClick={() => handleBuyTokens('bundle_5M')}
                className="bg-primary text-white px-4 py-2 rounded font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 h-fit mt-1"
              >
                ₹4,000
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#F2DED6] shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Token Cost Breakdown</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">Lead Discovery (per lead)</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">1 Token</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">AI Lead Scoring/Enrichment</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">3 Tokens</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">AI Email Generation</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">2 Tokens</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">AI SMS Generation</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">1 Token</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">AI LinkedIn Generation</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">2 Tokens</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">Image Generation</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">5 Tokens</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-600">Inbox AI Reply</span>
              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">1 Token</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-900 font-bold">Voice Call (per minute)</span>
              <span className="font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">15 Tokens</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">* Voice calls consume significantly more tokens due to real-time telephony charges and intensive STT/TTS processing.</p>
        </div>

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
              <p className="font-medium text-gray-900">Cashfree Saved Card</p>
              <p className="text-xs text-gray-500">Manage via Cashfree portal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
