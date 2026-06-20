import { Link } from 'react-router-dom';
import { Mail, Lock, User, Building, ArrowRight, Hourglass } from 'lucide-react';

export default function Register() {
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
            <form className="space-y-5" action="#" method="POST">
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
                    className="block w-full pl-10 bg-white border border-[#F2DED6] rounded-xl py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all shadow-sm outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Link to="/app" className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-[0_4px_14px_0_rgba(221,138,115,0.39)] hover:shadow-[0_6px_20px_rgba(221,138,115,0.23)] text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#FAF9F6] focus:ring-primary transition-all hover:-translate-y-0.5 active:translate-y-0">
                  Start 14-day free trial <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Visual / Image */}
      <div className="hidden lg:flex flex-1 bg-[#FDF8F5] relative items-center justify-center overflow-hidden border-l border-[#F2DED6]">
        {/* Abstract Background pattern */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(221,138,115,0.2),transparent_60%)]"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center max-w-2xl">
          <div className="w-80 h-80 bg-white rounded-3xl p-4 shadow-[0_20px_50px_rgba(221,138,115,0.15)] mb-10 transform -rotate-3 hover:rotate-0 transition-transform duration-500 border border-[#F2DED6]">
            <img 
              src="/gtm_dashboard_illustration.png" 
              alt="GTM Platform" 
              className="w-full h-full object-cover rounded-2xl"
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
