import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Zap, Bell, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../api/client';

function StatCard({ title, value, unit, icon: Icon, color, trend, sub }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">
          {value !== null && value !== undefined ? value.toLocaleString('fr-FR') : '—'}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== null && trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
            trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-600' : 'text-gray-500'
          }`}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trend !== null ? `${trend > 0 ? '+' : ''}${trend}% vs mois précédent` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [synthese,  setSynthese]  = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [alertes,   setAlertes]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/indicateurs/synthese'),
      api.get('/indicateurs/evolution?type_energie=electricite&nb_mois=12'),
      api.get('/alertes?traitee=false&limit=5'),
    ]).then(([s, e, a]) => {
      setSynthese(s.data);
      setEvolution(e.data);
      setAlertes(a.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const chartData = evolution?.donnees?.map(d => ({
    mois: d.mois.slice(5), // MM
    total: Math.round(d.total),
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la consommation énergétique du parc</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Bâtiments actifs"
          value={synthese?.nb_sites}
          icon={Building2}
          color="bg-blue-600"
          sub={`${synthese?.nb_compteurs} compteurs`}
        />
        <StatCard
          title="Électricité ce mois"
          value={synthese?.conso_elec_mois ? Math.round(synthese.conso_elec_mois) : null}
          unit="kWh"
          icon={Zap}
          color="bg-yellow-500"
          trend={synthese?.variation_pct}
          sub="Tous bâtiments"
        />
        <StatCard
          title="Alertes en attente"
          value={synthese?.nb_alertes}
          icon={Bell}
          color={synthese?.nb_alertes > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          sub={synthese?.nb_alertes > 0 ? 'Nécessitent attention' : 'Aucune alerte active'}
        />
        <StatCard
          title="Tendance globale"
          value={evolution?.tendance?.label ? null : '—'}
          icon={evolution?.tendance?.a > 0 ? TrendingUp : TrendingDown}
          color={evolution?.tendance?.a > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          sub={evolution?.tendance?.label || ''}
        />
      </div>

      {/* Chart + Alertes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Évolution électricité */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Électricité — 12 derniers mois</h2>
            <Link to="/indicateurs" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Détails <ArrowRight size={14} />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`${v.toLocaleString('fr-FR')} kWh`, 'Électricité']} />
                <Line
                  type="monotone" dataKey="total"
                  stroke="#1e40af" strokeWidth={2.5}
                  dot={{ fill: '#1e40af', r: 3 }} activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Aucune donnée disponible</p>
          )}
        </div>

        {/* Alertes récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Alertes récentes</h2>
            <Link to="/alertes" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {alertes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={32} className="text-emerald-500 mb-2" />
              <p className="text-sm text-gray-500">Aucune alerte en cours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertes.map(a => (
                <div key={a.id} className={`flex gap-3 p-3 rounded-lg border ${
                  a.niveau === 'critical' ? 'bg-red-50 border-red-200' :
                  a.niveau === 'warning'  ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                    a.niveau === 'critical' ? 'text-red-500' :
                    a.niveau === 'warning'  ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{a.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('fr-FR')}
                      {a.site_nom && ` · ${a.site_nom}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
