import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';
import api from '../api/client';

const TABS = ['Normalisé', 'Évolution', 'Anomalies', 'Tendances'];

const PERIODS = [
  { label: '1h',  value: '1h' },
  { label: '6h',  value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7j',  value: '7d' },
  { label: '1M',  value: '1M' },
  { label: '3M',  value: '3M' },
  { label: '12M', value: '12M' },
];

const ENERGIE_UNITS = {
  electricite: 'kWh', gaz: 'm³', eau: 'm³', fioul: 'L', bois: 'kg', autre: 'kWh',
};

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {PERIODS.map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
            value === p.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function TendanceIcon({ label }) {
  if (label?.includes('hausse')) return <TrendingUp size={15} className="text-red-500" />;
  if (label?.includes('baisse')) return <TrendingDown size={15} className="text-emerald-500" />;
  return <span className="text-gray-400">→</span>;
}

export default function IndicateursPage() {
  const [tab, setTab] = useState(0);
  const [normalises, setNormalises] = useState([]);
  const [evolution,  setEvolution]  = useState(null);
  const [anomalies,  setAnomalies]  = useState([]);
  const [tendances,  setTendances]  = useState([]);
  const [typeEnergie, setTypeEnergie] = useState('electricite');
  const [periode,     setPeriode]     = useState('12M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/indicateurs/normalises'),
      api.get(`/indicateurs/evolution?type_energie=${typeEnergie}&periode=${periode}`),
      api.get('/indicateurs/anomalies?nb_mois=12'),
      api.get('/indicateurs/tendances?nb_mois=12'),
    ]).then(([n, e, a, t]) => {
      setNormalises(n.data);
      setEvolution(e.data);
      setAnomalies(a.data);
      setTendances(t.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [typeEnergie, periode]);

  const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed'];

  return (
    <div className="max-w-7xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Indicateurs énergétiques</h1>

      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* === Tab 0 : Normalisée === */}
          {tab === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">kWh/m² — mois courant, électricité</p>
              {normalises.length === 0 ? (
                <p className="text-gray-400 text-sm py-8">Aucune donnée ce mois</p>
              ) : (
                <>
                  <div className="card overflow-x-auto p-0">
                    <table className="table-auto w-full">
                      <thead><tr>
                        <th>Rang</th><th>Bâtiment</th><th>Type</th><th>Surface (m²)</th>
                        <th>Élec. (kWh)</th><th>Gaz (kWh)</th><th>kWh/m²</th>
                      </tr></thead>
                      <tbody>
                        {normalises.map(s => (
                          <tr key={s.site_id}>
                            <td><span className={`font-bold ${s.rang === 1 ? 'text-emerald-600' : s.rang <= 3 ? 'text-blue-600' : 'text-gray-400'}`}>#{s.rang}</span></td>
                            <td className="font-medium">{s.nom}</td>
                            <td className="capitalize text-gray-500">{s.type_batiment || '—'}</td>
                            <td className="text-right">{s.surface ? parseFloat(s.surface).toLocaleString('fr-FR') : '—'}</td>
                            <td className="text-right font-mono">{Math.round(s.total_kwh || 0).toLocaleString('fr-FR')}</td>
                            <td className="text-right font-mono">{Math.round(s.conso_gaz || 0).toLocaleString('fr-FR')}</td>
                            <td className="text-right">
                              <span className={`font-semibold ${s.conso_norm < 15 ? 'text-emerald-600' : s.conso_norm < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                                {s.conso_norm?.toFixed(2) ?? '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Consommation normalisée par bâtiment (kWh/m²)</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={normalises} margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="nom" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                          formatter={v => [`${v} kWh/m²`]}
                        />
                        <Bar dataKey="conso_norm" name="kWh/m²" radius={[3,3,0,0]}>
                          {normalises.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* === Tab 1 : Évolution === */}
          {tab === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select className="input w-40" value={typeEnergie} onChange={e => setTypeEnergie(e.target.value)}>
                  {['electricite','gaz','eau','fioul','bois'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <PeriodSelector value={periode} onChange={setPeriode} />
                {evolution?.tendance && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
                    <TendanceIcon label={evolution.tendance.label} />
                    <strong>{evolution.tendance.label}</strong>
                    <span className="text-gray-400 text-xs">
                      ({evolution.tendance.a > 0 ? '+' : ''}{evolution.tendance.a} {ENERGIE_UNITS[typeEnergie]}/mois)
                    </span>
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {typeEnergie} — {periode}
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={evolution?.donnees?.map(d => ({ mois: d.mois, total: Math.round(d.total) })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={v => [`${v.toLocaleString('fr-FR')} ${ENERGIE_UNITS[typeEnergie]}`]}
                    />
                    <Line type="monotone" dataKey="total" name={typeEnergie} stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* === Tab 2 : Anomalies === */}
          {tab === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Détection par z-score (seuil &gt; 2σ) — 12 mois</p>
              {anomalies.length === 0 ? (
                <div className="card py-8 text-sm text-gray-500">
                  Aucune anomalie détectée sur la période.
                </div>
              ) : (
                anomalies.map(a => (
                  <div key={a.compteur_id} className="card border-l-4 border-amber-400">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-amber-500" />
                      <span className="font-semibold text-sm text-gray-900">{a.site_nom} — {a.compteur_nom}</span>
                      <span className="badge-warning ml-auto">{a.type_energie}</span>
                    </div>
                    {a.anomalies.map((ano, i) => (
                      <div key={i} className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-2 mb-2">
                        <span className="font-medium">{ano.mois}</span>
                        <span className="text-gray-500"> · {Math.round(ano.valeur).toLocaleString('fr-FR')} kWh</span>
                        <span className="ml-2 text-amber-700 font-mono text-xs">z={ano.zscore}σ</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* === Tab 3 : Tendances === */}
          {tab === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Régression linéaire par compteur — 12 mois</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tendances.map(t => (
                  <div key={t.compteur_id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <TendanceIcon label={t.tendance.label} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.compteur_nom}</p>
                        <p className="text-xs text-gray-400">{t.site_nom} · {t.type_energie}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        t.tendance.a > 50 ? 'bg-red-100 text-red-700' :
                        t.tendance.a < -50 ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.tendance.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400 mb-0.5">Pente</p>
                        <p className="font-mono font-medium text-gray-700">{t.tendance.a > 0 ? '+' : ''}{t.tendance.a}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400 mb-0.5">R²</p>
                        <p className="font-mono font-medium text-gray-700">{t.tendance.r2}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400 mb-0.5">Relevés</p>
                        <p className="font-medium text-gray-700">{t.valeurs?.length}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
