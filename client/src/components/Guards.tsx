import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

const Splash = () => <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6 text-violet-300" /></div>;

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
}
export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
export function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
