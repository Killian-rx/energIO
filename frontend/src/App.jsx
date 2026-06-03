import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import SitesPage        from './pages/SitesPage';
import SiteDetailPage   from './pages/SiteDetailPage';
import CompteurPage     from './pages/CompteurPage';
import IndicateursPage  from './pages/IndicateursPage';
import ReglesPage       from './pages/ReglesPage';
import AlertesPage      from './pages/AlertesPage';
import ImportPage       from './pages/ImportPage';
import UtilisateursPage from './pages/UtilisateursPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout><DashboardPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/sites" element={
        <ProtectedRoute>
          <Layout><SitesPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/sites/:id" element={
        <ProtectedRoute>
          <Layout><SiteDetailPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/compteurs" element={
        <ProtectedRoute>
          <Layout><CompteurPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/indicateurs" element={
        <ProtectedRoute>
          <Layout><IndicateursPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/alertes" element={
        <ProtectedRoute>
          <Layout><AlertesPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/regles" element={
        <ProtectedRoute minRole="gestionnaire">
          <Layout><ReglesPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/import" element={
        <ProtectedRoute minRole="gestionnaire">
          <Layout><ImportPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/utilisateurs" element={
        <ProtectedRoute minRole="admin">
          <Layout><UtilisateursPage /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
