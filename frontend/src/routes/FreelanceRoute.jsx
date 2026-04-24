import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../components/common/Loader';
import useAuth from '../hooks/useAuth';

export default function FreelanceRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Loader label="Chargement de l'espace freelance..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (user?.role !== 'FREELANCER') {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}
