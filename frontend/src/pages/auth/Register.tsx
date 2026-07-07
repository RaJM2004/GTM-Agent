import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, Hourglass, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GOOGLE_CLIENT_ID = '132151710812-shpgebrlqi13oje595ouod0888ec3d12.apps.googleusercontent.com'; // Default client ID

export default function Register() {
  const { register, googleLogin, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  // Clean errors on load
  useEffect(() => {
    clearError();
    return () => clearError();
  }, []);

  // Initialize Google Sign-In button
  useEffect(() => {
    const initGoogleGSI = () => {
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            cancel_on_tap_outside: false,
          });

          const buttonParent = document.getElementById('google-signup-btn');
          if (buttonParent) {
            window.google.accounts.id.renderButton(buttonParent, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signup_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: buttonParent.clientWidth || 384,
            });
          }
        } catch (err) {
          console.error('Failed to initialize Google GSI on Register:', err);
        }
      } else {
        setTimeout(initGoogleGSI, 500);
      }
    };

    initGoogleGSI();
  }, []);

  const handleGoogleCallback = async (response: any) => {
    if (response.credential) {
      try {
        setLocalError(null);
        await googleLogin(response.credential);
        navigate('/app');
      } catch (err: any) {
        console.error('Google Sign-up failed:', err);
        setLocalError(err.message || 'Google signup failed. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Simple Form Validations
    if (!name.trim() || !company.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      await register(name, company, email, password);
      navigate('/app');
    } catch (err: any) {
      // AuthContext handles context error state
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Register Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-[#FAF9F6] relative z-10 py-12">
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
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in to your workspace
              </Link>
            </p>
          </div>

          <div className="mt-8">
            {/* Error display */}
            {(localError || error) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 font-medium">{localError || error}</div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Work Email
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] hover:shadow-[0_6px_20px_rgba(221,138,115,0.23)] text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#FAF9F6] focus:ring-primary transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      Start 14-day free trial <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#F2DED6]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#FAF9F6] text-gray-500">Or sign up with</span>
                </div>
              </div>

              {/* Native Google Sign-Up Button */}
              <div className="flex justify-center w-full">
                <div id="google-signup-btn" className="w-full min-h-[44px]"></div>
              </div>
            </div>
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
