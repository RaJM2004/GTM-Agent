import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Hourglass, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Missing token parameter.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Cannot submit. Token is missing.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        bodyData: { token, new_password: password },
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-[#FAF9F6] relative z-10">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#F2DED6]">
              <Hourglass className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              Genquantaa <span className="text-primary font-medium">GTM OS</span>
            </span>
          </Link>
          
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Reset password
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Create a new secure password for your workspace.
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {success ? (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-sm text-emerald-800">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1 font-medium">
                    Password updated successfully! You can now log in using your new credentials.
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Go to login <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      disabled={!token}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none disabled:opacity-50 disabled:bg-gray-100"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      disabled={!token}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none disabled:opacity-50 disabled:bg-gray-100"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] hover:shadow-[0_6px_20px_rgba(221,138,115,0.23)] text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#FAF9F6] focus:ring-primary transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving password...
                      </>
                    ) : (
                      <>
                        Save and reset password <ArrowLeft className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Visual / Image */}
      <div className="hidden lg:flex flex-1 bg-[#FDF8F5] relative items-center justify-center overflow-hidden border-l border-[#F2DED6]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(221,138,115,0.2),transparent_60%)]"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center max-w-2xl">
          <div className="w-80 h-80 bg-white rounded-3xl p-4 shadow-[0_20px_50px_rgba(221,138,115,0.15)] mb-10 transform -rotate-3 hover:rotate-0 transition-transform duration-500 border border-[#F2DED6]">
            <img 
              src="/gtm_dashboard_illustration.png" 
              alt="GTM Platform" 
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop";
              }}
            />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">The ultimate AI Outreach Engine</h3>
          <p className="text-lg text-gray-600 leading-relaxed">
            Automate your lead discovery, perfectly orchestrate multi-channel sequences, and book meetings on autopilot with Genquantaa GTM OS.
          </p>
        </div>
      </div>
    </div>
  );
}
