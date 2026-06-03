import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Zap, Bell, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';

const PERIODS = [
  { label: '1h',  value: '1h' },
  { label: '6h',  value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7j',  value: '7d' },
  { label: '1M',  value: '1M' },
  { label: '3M',  value: '3M' },
  { label: '12M', value: '12M' },
];

const SHORT_PERIODS = new Set(['1h','6h','24h','7d']);

// Formateur Y-axis adaptatif — évite le "0k" pour les petites valeurs
function fmtY(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  if (v >= 10)        return Math.round(v);
  if (v >= 1)         return parseFloat(v.toFixed(1));
  if (v > 0)          return parseFloat(v.toFixed(2));
  return 0;
}

// Formateur tooltip — précision adaptée à la magnitude
function fmtVal(v, unit) {
  const n = v >= 100  ? Math.round(v).toLocaleString('fr-FR')
          : v >= 1    ? parseFloat(v.toFixed(2)).toLocaleString('fr-FR')
          : parseFloat(v.toFixed(3)).toLocaleString('fr-FR');
  return `${n} ${unit}`;
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 flex-wrap">
      {PERIODS.map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className={`px-2 py-1 text-xs rounded-md transition-colors font-medium ${
            value === p.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ title, value, unit, icon: Icon, color, trend, sub }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">
          {value !== null && value !== undefined
            ? (typeof value === 'string' ? value : value.toLocaleString('fr-FR'))
            : '—'}
          {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend !== null && trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs mt-1.5 ${
            trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-600' : 'text-gray-400'
          }`}>
            {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {`${trend > 0 ? '+' : ''}${trend}% vs mois préc.`}
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
  const [periode,   setPeriode]   = useState('12M');

  useEffect(() => {
    Promise.all([
      api.get('/indicateurs/synthese'),
      api.get(`/indicateurs/evolution?type_energie=electricite&periode=${periode}`),
      api.get('/alertes?traitee=false&limit=5'),
    ]).then(([s, e, a]) => {
      setSynthese(s.data);
      setEvolution(e.data);
      setAlertes(a.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [periode]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-blue-600" /></div>;
  }

  // Conserver la précision — ne pas arrondir à l'entier
  const chartData = evolution?.donnees?.map(d => ({
    mois:  d.mois,
    total: parseFloat(parseFloat(d.total).toFixed(2)),
  })) || [];

  const isShort = SHORT_PERIODS.has(periode);

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-xl font-semibold text-gray-900">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Bâtiments"
          value={synthese?.nb_sites}
          icon={Building2}
          color="bg-blue-600"
          sub={`${synthese?.nb_compteurs} compteurs`}
        />
        <StatCard
          title="Électricité — mois en cours"
          value={synthese?.conso_elec_mois ? Math.round(synthese.conso_elec_mois) : null}
          unit="kWh"
          icon={Zap}
          color="bg-amber-500"
          trend={synthese?.variation_pct}
        />
        <StatCard
          title="Alertes en attente"
          value={synthese?.nb_alertes ?? 0}
          icon={Bell}
          color={synthese?.nb_alertes > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          sub={synthese?.nb_alertes > 0 ? `${synthese.nb_alertes} à traiter` : 'Aucune alerte'}
        />
        <StatCard
          title="Tendance"
          value={evolution?.tendance?.label || '—'}
          icon={evolution?.tendance?.a > 0 ? TrendingUp : TrendingDown}
          color={evolution?.tendance?.a > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          sub={!isShort && evolution?.tendance
            ? `${evolution.tendance.a > 0 ? '+' : ''}${evolution.tendance.a} kWh/mois`
            : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-700">Électricité</h2>
            <div className="flex items-center gap-3">
              <PeriodSelector value={periode} onChange={setPeriode} />
              <Link to="/indicateurs" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Indicateurs <ArrowRight size={13} />
              </Link>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtY} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,.08)', fontSize: 12 }}
                  formatter={v => [fmtVal(v, 'kWh'), 'Électricité']}
                />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Aucune donnée sur cette période</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Alertes récentes</h2>
            <Link to="/alertes" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>
          {alertes.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              Aucune alerte en cours
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map(a => (
                <div key={a.id} className={`flex gap-2.5 p-3 rounded-lg border ${
                  a.niveau === 'critical' ? 'bg-red-50 border-red-100' :
                  a.niveau === 'warning'  ? 'bg-amber-50 border-amber-100' :
                  'bg-blue-50 border-blue-100'
                }`}>
                  <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${
                    a.niveau === 'critical' ? 'text-red-500' :
                    a.niveau === 'warning'  ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
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
