import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, MapPin, Ruler, Calendar, Gauge,
  Bell, TrendingUp, TrendingDown, Minus, Loader2,
  AlertTriangle, CheckCircle, Zap,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const TYPE_LABELS = { bureau: 'Bureau', erp: 'ERP', technique: 'Technique', logement: 'Logement', autre: 'Autre' };

const ENERGIE_UNITS = {
  electricite: 'kWh', gaz: 'kWh', eau: 'm³', fioul: 'L', bois: 'kg', autre: 'kWh',
};
const ENERGIE_LABELS = {
  electricite: 'Électricité', gaz: 'Gaz', eau: 'Eau', fioul: 'Fioul', bois: 'Bois', autre: 'Autre',
};

function fmtY(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  if (v >= 10)        return Math.round(v);
  if (v >= 1)         return parseFloat(v.toFixed(1));
  if (v > 0)          return parseFloat(v.toFixed(2));
  return 0;
}

function fmtVal(v, unit) {
  const n = v >= 100  ? Math.round(v).toLocaleString('fr-FR')
          : v >= 1    ? parseFloat(v.toFixed(2)).toLocaleString('fr-FR')
          : parseFloat(v.toFixed(3)).toLocaleString('fr-FR');
  return `${n} ${unit}`;
}

const PERIODS = [
  { label: '1h',  value: '1h' },
  { label: '6h',  value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7j',  value: '7d' },
  { label: '1M',  value: '1M' },
  { label: '3M',  value: '3M' },
  { label: '12M', value: '12M' },
];

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
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
const ENERGIE_COLORS = {
  electricite: 'bg-yellow-100 text-yellow-800',
  gaz: 'bg-orange-100 text-orange-800',
  eau: 'bg-blue-100 text-blue-800',
  fioul: 'bg-gray-200 text-gray-800',
  bois: 'bg-amber-100 text-amber-800',
  autre: 'bg-gray-100 text-gray-700',
};

function KpiCard({ label, value, unit, sub, trend, icon: Icon, iconColor }) {
  return (
    <div className="card flex items-start gap-3">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-none">
          {value !== null && value !== undefined ? value.toLocaleString('fr-FR') : '—'}
          {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend !== null && trend !== undefined && (
          <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
            trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-600' : 'text-gray-400'
          }`}>
            {trend > 0 ? <TrendingUp size={11}/> : trend < 0 ? <TrendingDown size={11}/> : <Minus size={11}/>}
            {trend > 0 ? '+' : ''}{trend}% vs mois préc.
          </span>
        )}
      </div>
    </div>
  );
}

export default function SiteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isGestionnaire } = useAuth();

  const [site,      setSite]      = useState(null);
  const [kpis,      setKpis]      = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  const [alertes,   setAlertes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [typeEnergie, setTypeEnergie] = useState('electricite');
  const [periode,     setPeriode]     = useState('12M');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/sites/${id}`),
      api.get(`/indicateurs/site/${id}`),
      api.get(`/compteurs?site_id=${id}`),
      api.get(`/alertes?traitee=false&site_id=${id}&limit=10`),
    ]).then(([s, k, c, a]) => {
      setSite(s.data);
      setKpis(k.data);
      setCompteurs(c.data);
      setAlertes(a.data);
    }).catch(() => navigate('/sites'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!site) return;
    api.get(`/indicateurs/evolution?type_energie=${typeEnergie}&periode=${periode}&site_id=${id}`)
      .then(r => setEvolution(r.data))
      .catch(() => {});
  }, [id, typeEnergie, periode, site]);

  async function handleTraiterAlerte(alerteId) {
    await api.patch(`/alertes/${alerteId}/traiter`);
    const { data } = await api.get(`/alertes?traitee=false&site_id=${id}&limit=10`);
    setAlertes(data);
    const { data: k } = await api.get(`/indicateurs/site/${id}`);
    setKpis(k);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!site) return null;

  const chartData = evolution?.donnees?.map(d => ({
    mois:  d.mois,
    total: parseFloat(parseFloat(d.total).toFixed(3)),
  })) || [];
  const unit = ENERGIE_UNITS[typeEnergie] || 'kWh';

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/sites')} className="p-1.5 text-gray-400 hover:text-gray-600 rounded mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{site.nom}</h1>
            {site.type_batiment && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {TYPE_LABELS[site.type_batiment] || site.type_batiment}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-400 flex-wrap">
            {(site.adresse || site.ville) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} />
                {[site.adresse, site.ville, site.code_postal].filter(Boolean).join(', ')}
              </span>
            )}
            {site.surface && (
              <span className="flex items-center gap-1.5">
                <Ruler size={13} />
                {parseFloat(site.surface).toLocaleString('fr-FR')} m²
              </span>
            )}
            {site.annee_construction && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {site.annee_construction}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Électricité — mois en cours"
          value={kpis?.conso_elec_mois ? Math.round(kpis.conso_elec_mois) : 0}
          unit="kWh"
          icon={Zap}
          iconColor="bg-amber-500"
          trend={kpis?.variation_pct}
        />
        <KpiCard
          label="Compteurs actifs"
          value={kpis?.nb_compteurs ?? 0}
          icon={Gauge}
          iconColor="bg-blue-600"
          sub={`${compteurs.filter(c => c.type_energie === 'gaz').length} Gaz · ${compteurs.filter(c => c.type_energie === 'eau').length} Eau`}
        />
        <KpiCard
          label="Alertes en attente"
          value={kpis?.nb_alertes ?? 0}
          icon={Bell}
          iconColor={kpis?.nb_alertes > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          sub={kpis?.nb_alertes > 0 ? `${kpis.nb_alertes} à traiter` : 'Aucune alerte'}
        />
      </div>

      {/* Chart + Alertes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-700">Consommation</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select className="input w-36 text-xs py-1.5" value={typeEnergie} onChange={e => setTypeEnergie(e.target.value)}>
                {Object.entries(ENERGIE_LABELS).filter(([v]) => v !== 'autre').map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <PeriodSelector value={periode} onChange={setPeriode} />
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtY} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={v => [fmtVal(v, unit), ENERGIE_LABELS[typeEnergie] ?? typeEnergie]}
                />
                <Line
                  type="monotone" dataKey="total"
                  stroke="#2563eb" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-12 text-center">Aucune donnée sur cette période</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Alertes actives</h2>
            <Link to={`/alertes`} className="text-xs text-blue-600 hover:text-blue-700">Toutes</Link>
          </div>
          {alertes.length === 0 ? (
            <div className="flex items-center gap-2 py-5 text-sm text-gray-400">
              <CheckCircle size={15} className="text-emerald-500 shrink-0" />
              Aucune alerte en attente
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border flex gap-2.5 ${
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
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {isGestionnaire && (
                    <button onClick={() => handleTraiterAlerte(a.id)}
                      className="shrink-0 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compteurs */}
      <div className="card overflow-x-auto p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Compteurs</h2>
          <Link to={`/compteurs`} className="text-xs text-blue-600 hover:text-blue-700">
            Gérer les compteurs
          </Link>
        </div>
        <table className="table-auto w-full">
          <thead><tr>
            <th>Nom</th><th>Énergie</th><th>Type</th><th>Référence</th>
            <th>Relevés</th><th>Dernier relevé</th>
          </tr></thead>
          <tbody>
            {compteurs.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-gray-900">{c.nom}</td>
                <td>
                  <span className={`badge ${ENERGIE_COLORS[c.type_energie]}`}>
                    {ENERGIE_LABELS[c.type_energie] ?? c.type_energie}
                  </span>
                </td>
                <td className="capitalize text-gray-500">{c.type_compteur}</td>
                <td className="font-mono text-xs text-gray-400">{c.reference || '—'}</td>
                <td className="text-right text-gray-600">{parseInt(c.nb_releves).toLocaleString('fr-FR')}</td>
                <td className="text-gray-400 text-xs">
                  {c.dernier_releve ? new Date(c.dernier_releve).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            ))}
            {compteurs.length === 0 && (
              <tr><td colSpan="6" className="text-center text-gray-400 py-8">Aucun compteur</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
