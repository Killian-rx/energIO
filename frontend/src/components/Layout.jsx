import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Gauge, BarChart3,
  Bell, ShieldAlert, Upload, Users, LogOut, Zap, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

const navItems = [
  { to: '/',              label: 'Tableau de bord',  icon: LayoutDashboard, roles: ['utilisateur','gestionnaire','admin'] },
  { to: '/sites',         label: 'Bâtiments',         icon: Building2,       roles: ['utilisateur','gestionnaire','admin'] },
  { to: '/compteurs',     label: 'Compteurs',          icon: Gauge,           roles: ['utilisateur','gestionnaire','admin'] },
  { to: '/indicateurs',   label: 'Indicateurs',        icon: BarChart3,       roles: ['utilisateur','gestionnaire','admin'] },
  { to: '/alertes',       label: 'Alertes',            icon: Bell,            roles: ['utilisateur','gestionnaire','admin'] },
  { to: '/regles',        label: 'Règles d\'alerte',   icon: ShieldAlert,     roles: ['gestionnaire','admin'] },
  { to: '/import',        label: 'Import / Export',    icon: Upload,          roles: ['gestionnaire','admin'] },
  { to: '/utilisateurs',  label: 'Utilisateurs',       icon: Users,           roles: ['admin'] },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin, isGestionnaire } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nbAlertes, setNbAlertes] = useState(0);

  useEffect(() => {
    api.get('/alertes/stats').then(r => setNbAlertes(parseInt(r.data.en_attente) || 0)).catch(() => {});
  }, [location.pathname]);

  const roleHierarchy = { admin: 3, gestionnaire: 2, utilisateur: 1 };
  const userLevel = roleHierarchy[user?.role] || 0;
  const visibleItems = navItems.filter(item =>
    item.roles.some(r => userLevel >= (roleHierarchy[r] || 0))
  );

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={`flex flex-col h-full bg-blue-900 text-white ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-800">
        <div className="p-2 bg-yellow-400 rounded-lg">
          <Zap size={20} className="text-blue-900" />
        </div>
        <div>
          <span className="font-bold text-xl tracking-tight">EnergIO</span>
          <p className="text-xs text-blue-300">Gestion Énergétique</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.to
            || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.to === '/alertes' && nbAlertes > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {nbAlertes > 99 ? '99+' : nbAlertes}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-xs text-blue-300 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} title="Déconnexion" className="p-1.5 text-blue-300 hover:text-red-400 rounded transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 w-72">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-blue-900 text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            <span className="font-bold">EnergIO</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
