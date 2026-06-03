import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, minRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (minRole) {
    const hierarchy = { admin: 3, gestionnaire: 2, utilisateur: 1 };
    if ((hierarchy[user.role] || 0) < (hierarchy[minRole] || 0)) {
      return <Navigate to="/" replace />;
    }
  }
  return children;
}
