import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute — wraps a component so only admin users can access it.
 * Non-admin users are silently redirected to the main app dashboard.
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
