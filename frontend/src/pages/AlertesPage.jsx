import { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Info, Loader2, Filter } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const NIVEAU_CONFIG = {
  critical: { icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-50 border-red-100', badge: 'badge-critical', label: 'Critique' },
  warning:  { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', badge: 'badge-warning', label: 'Alerte' },
  info:     { icon: Info,          color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100',  badge: 'badge-info', label: 'Info' },
};

export default function AlertesPage() {
  const { isGestionnaire } = useAuth();
  const [alertes, setAlertes] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('non_traitees');
  const [niveau,  setNiveau]  = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (filter === 'non_traitees') params.set('traitee', 'false');
    if (niveau) params.set('niveau', niveau);
    params.set('limit', '100');

    const [a, s] = await Promise.all([
      api.get('/alertes?' + params.toString()),
      api.get('/alertes/stats'),
    ]);
    setAlertes(a.data);
    setStats(s.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter, niveau]);

  async function handleTraiter(id) {
    await api.patch(`/alertes/${id}/traiter`);
    load();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Alertes</h1>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'En attente',    value: stats.en_attente,    accent: 'text-red-600' },
            { label: 'Critiques',     value: stats.critiques,     accent: 'text-red-500' },
            { label: 'Alertes',       value: stats.warnings,      accent: 'text-amber-600' },
            { label: 'Info',          value: stats.infos,         accent: 'text-blue-600' },
            { label: 'Cette semaine', value: stats.cette_semaine, accent: 'text-gray-600' },
          ].map(s => (
            <div key={s.label} className="card py-3 px-4">
              <p className={`text-2xl font-bold ${s.accent}`}>{parseInt(s.value) || 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { val: 'non_traitees', label: 'En attente' },
            { val: 'toutes',       label: 'Toutes' },
          ].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === f.val ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select className="input w-36" value={niveau} onChange={e => setNiveau(e.target.value)}>
            <option value="">Tous niveaux</option>
            <option value="critical">Critique</option>
            <option value="warning">Alerte</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : alertes.length === 0 ? (
        <div className="card py-10 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm text-gray-500">
            {filter === 'non_traitees' ? 'Aucune alerte en attente' : 'Aucune alerte enregistrée'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes.map(a => {
            const cfg = NIVEAU_CONFIG[a.niveau] || NIVEAU_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`card border ${cfg.bg} flex items-start gap-4 p-4`}>
                <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cfg.badge}>{cfg.label}</span>
                    {a.site_nom && <span className="badge-gray">{a.site_nom}</span>}
                    {a.compteur_nom && <span className="badge-gray">{a.compteur_nom}</span>}
                  </div>
                  <p className="text-sm text-gray-800 mt-1.5 font-medium">{a.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                    {a.valeur_detectee !== null && (
                      <span>Valeur : <strong className="text-gray-600">{parseFloat(a.valeur_detectee).toLocaleString('fr-FR')}</strong></span>
                    )}
                    {a.seuil !== null && (
                      <span>Seuil : <strong className="text-gray-600">{parseFloat(a.seuil).toLocaleString('fr-FR')}</strong></span>
                    )}
                    {a.regle_nom && <span>Règle : {a.regle_nom}</span>}
                  </div>
                  {a.traitee && (
                    <p className="text-xs text-emerald-700 mt-1.5">
                      Traité le {new Date(a.traitee_at).toLocaleString('fr-FR')}{a.traite_par_nom ? ` par ${a.traite_par_nom}` : ''}
                    </p>
                  )}
                </div>
                {!a.traitee && isGestionnaire && (
                  <button onClick={() => handleTraiter(a.id)} className="btn-success shrink-0 text-xs py-1.5 px-3">
                    <CheckCircle size={14} /> Traiter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
