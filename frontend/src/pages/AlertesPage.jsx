import { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Info, Loader2, Filter } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const NIVEAU_CONFIG = {
  critical: { icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-50 border-red-200', badge: 'badge-critical' },
  warning:  { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', badge: 'badge-warning' },
  info:     { icon: Info,          color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200',  badge: 'badge-info' },
};

export default function AlertesPage() {
  const { isGestionnaire } = useAuth();
  const [alertes, setAlertes] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('non_traitees'); // non_traitees | toutes
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-gray-500 text-sm mt-1">Événements déclenchés par les règles de surveillance</p>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'En attente',     value: stats.en_attente,    color: 'text-red-600 bg-red-50',     border: 'border-red-200' },
            { label: 'Critiques',      value: stats.critiques,     color: 'text-red-800 bg-red-100',    border: 'border-red-300' },
            { label: 'Warnings',       value: stats.warnings,      color: 'text-amber-800 bg-amber-50', border: 'border-amber-200' },
            { label: 'Info',           value: stats.infos,         color: 'text-blue-700 bg-blue-50',   border: 'border-blue-200' },
            { label: 'Cette semaine',  value: stats.cette_semaine, color: 'text-gray-700 bg-gray-50',   border: 'border-gray-200' },
          ].map(s => (
            <div key={s.label} className={`card py-3 px-4 border ${s.border} ${s.color}`}>
              <p className="text-2xl font-bold">{parseInt(s.value) || 0}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
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
                filter === f.val ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select className="input w-36" value={niveau} onChange={e => setNiveau(e.target.value)}>
            <option value="">Tous niveaux</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : alertes.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <p className="font-medium text-gray-700">Aucune alerte {filter === 'non_traitees' ? 'en attente' : ''}</p>
          <p className="text-sm text-gray-400 mt-1">Toutes les règles sont dans les normes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map(a => {
            const cfg = NIVEAU_CONFIG[a.niveau] || NIVEAU_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`card border ${cfg.bg} flex items-start gap-4 p-4`}>
                <Icon size={20} className={`shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={cfg.badge}>{a.niveau}</span>
                    {a.site_nom && <span className="badge-gray">{a.site_nom}</span>}
                    {a.compteur_nom && <span className="badge-gray">{a.compteur_nom}</span>}
                  </div>
                  <p className="text-sm text-gray-800 mt-1.5 font-medium">{a.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                    {a.valeur_detectee !== null && (
                      <span>Valeur : <strong>{parseFloat(a.valeur_detectee).toLocaleString('fr-FR')}</strong></span>
                    )}
                    {a.seuil !== null && (
                      <span>Seuil : <strong>{parseFloat(a.seuil).toLocaleString('fr-FR')}</strong></span>
                    )}
                    {a.regle_nom && <span>Règle : {a.regle_nom}</span>}
                  </div>
                  {a.traitee && (
                    <p className="text-xs text-emerald-700 mt-1">
                      ✓ Traité le {new Date(a.traitee_at).toLocaleString('fr-FR')} par {a.traite_par_nom || '—'}
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
