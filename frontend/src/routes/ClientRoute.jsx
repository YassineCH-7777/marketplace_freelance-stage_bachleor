import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../components/common/Loader';
import useAuth from '../hooks/useAuth';

export default function ClientRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Loader label="Chargement de l'espace client..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (user?.role !== 'CLIENT') {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}
