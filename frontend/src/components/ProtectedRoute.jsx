import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';
import { roleHome } from '../utils/format';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Checking session…" className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}
