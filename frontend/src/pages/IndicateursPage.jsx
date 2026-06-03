import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import api from '../api/client';

const TABS = ['Consommation normalisée', 'Évolution', 'Anomalies', 'Tendances'];

function TendanceIcon({ label }) {
  if (label?.includes('hausse')) return <TrendingUp size={16} className="text-red-500" />;
  if (label?.includes('baisse')) return <TrendingDown size={16} className="text-emerald-500" />;
  return <span className="text-gray-400 text-xs">→</span>;
}

export default function IndicateursPage() {
  const [tab, setTab] = useState(0);
  const [normalises, setNormalises] = useState([]);
  const [evolution,  setEvolution]  = useState(null);
  const [anomalies,  setAnomalies]  = useState([]);
  const [tendances,  setTendances]  = useState([]);
  const [typeEnergie, setTypeEnergie] = useState('electricite');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const reqs = [
      api.get('/indicateurs/normalises'),
      api.get(`/indicateurs/evolution?type_energie=${typeEnergie}&nb_mois=12`),
      api.get('/indicateurs/anomalies?nb_mois=12'),
      api.get('/indicateurs/tendances?nb_mois=12'),
    ];
    Promise.all(reqs).then(([n, e, a, t]) => {
      setNormalises(n.data);
      setEvolution(e.data);
      setAnomalies(a.data);
      setTendances(t.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [typeEnergie]);

  const COLORS = ['#1e40af','#059669','#d97706','#dc2626','#7c3aed'];

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Indicateurs énergétiques</h1>
        <p className="text-gray-500 text-sm mt-1">Analyses calculées, normalisées et consolidées</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* === Tab 0 : Normalisée === */}
          {tab === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Classement des bâtiments par consommation électrique normalisée (kWh/m²) — mois courant. Moins c'est mieux.</p>
              {normalises.length === 0 ? (
                <p className="text-gray-400 text-center py-12">Aucune donnée ce mois</p>
              ) : (
                <>
                  <div className="card overflow-x-auto p-0">
                    <table className="table-auto w-full">
                      <thead><tr>
                        <th>Rang</th><th>Bâtiment</th><th>Type</th><th>Surface (m²)</th>
                        <th>Élec. (kWh)</th><th>Gaz (kWh)</th><th>kWh élec./m²</th>
                      </tr></thead>
                      <tbody>
                        {normalises.map(s => (
                          <tr key={s.site_id}>
                            <td><span className={`font-bold ${s.rang === 1 ? 'text-emerald-600' : s.rang <= 3 ? 'text-blue-600' : 'text-gray-500'}`}>#{s.rang}</span></td>
                            <td className="font-medium">{s.nom}</td>
                            <td className="capitalize text-gray-500">{s.type_batiment || '—'}</td>
                            <td className="text-right">{s.surface ? parseFloat(s.surface).toLocaleString('fr-FR') : '—'}</td>
                            <td className="text-right font-mono">{Math.round(s.total_kwh || 0).toLocaleString('fr-FR')}</td>
                            <td className="text-right font-mono">{Math.round(s.conso_gaz || 0).toLocaleString('fr-FR')}</td>
                            <td className="text-right">
                              <span className={`font-bold ${s.conso_norm < 15 ? 'text-emerald-600' : s.conso_norm < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                                {s.conso_norm?.toFixed(2) ?? '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-4">Consommation normalisée par bâtiment (kWh/m²)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={normalises} margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={v => [`${v} kWh/m²`]} />
                        <Bar dataKey="conso_norm" name="kWh/m²" radius={[4,4,0,0]}>
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
              <div className="flex items-center gap-4">
                <select className="input w-48" value={typeEnergie} onChange={e => setTypeEnergie(e.target.value)}>
                  {['electricite','gaz','eau','fioul','bois'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {evolution?.tendance && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TendanceIcon label={evolution.tendance.label} />
                    <span>Tendance : <strong>{evolution.tendance.label}</strong></span>
                    <span className="text-gray-400">(pente {evolution.tendance.a > 0 ? '+' : ''}{evolution.tendance.a} kWh/mois, R²={evolution.tendance.r2})</span>
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Évolution mensuelle — {typeEnergie} (12 mois)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolution?.donnees?.map(d => ({ mois: d.mois, total: Math.round(d.total) })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => [`${v.toLocaleString('fr-FR')} kWh`]} />
                    <Legend />
                    <Line type="monotone" dataKey="total" name={typeEnergie} stroke="#1e40af" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* === Tab 2 : Anomalies === */}
          {tab === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Détection par z-score (seuil {'>'} 2σ) sur les 12 derniers mois.</p>
              {anomalies.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-emerald-600 font-medium">Aucune anomalie détectée</p>
                  <p className="text-gray-400 text-sm mt-1">Toutes les consommations sont dans les normes statistiques</p>
                </div>
              ) : (
                anomalies.map(a => (
                  <div key={a.compteur_id} className="card border-l-4 border-amber-400">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <span className="font-semibold text-gray-900">{a.site_nom} — {a.compteur_nom}</span>
                      <span className="badge-warning">{a.type_energie}</span>
                    </div>
                    {a.anomalies.map((ano, i) => (
                      <div key={i} className="text-sm text-gray-700 bg-amber-50 rounded-lg px-4 py-2 mb-2">
                        <span className="font-medium">{ano.mois}</span> : {Math.round(ano.valeur).toLocaleString('fr-FR')} kWh
                        <span className="ml-2 text-amber-700 font-mono text-xs">(z-score: {ano.zscore}σ)</span>
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
              <p className="text-sm text-gray-500">Régression linéaire par compteur sur 12 mois (pente en kWh/mois).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tendances.map(t => (
                  <div key={t.compteur_id} className="card">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${t.tendance.a > 10 ? 'bg-red-100' : t.tendance.a < -10 ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <TendanceIcon label={t.tendance.label} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{t.compteur_nom}</p>
                        <p className="text-xs text-gray-500">{t.site_nom} · {t.type_energie}</p>
                      </div>
                      <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${
                        t.tendance.a > 50 ? 'bg-red-100 text-red-700' :
                        t.tendance.a < -50 ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.tendance.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400">Pente</p>
                        <p className="font-mono font-medium">{t.tendance.a > 0 ? '+' : ''}{t.tendance.a} kWh/m</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400">R²</p>
                        <p className="font-mono font-medium">{t.tendance.r2}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-400">Relevés</p>
                        <p className="font-medium">{t.valeurs?.length}</p>
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
