import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hourglass } from 'lucide-react';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#F2DED6] shadow-sm flex items-center justify-center relative">
          <Hourglass className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '2.5s' }} />
          <span className="absolute -inset-1 rounded-2xl border border-primary/20 animate-pulse pointer-events-none"></span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Genquantaa <span className="text-primary font-medium">GTM OS</span>
          </span>
          <span className="text-xs text-gray-500 font-medium tracking-wide uppercase animate-pulse">
            Authenticating Session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
