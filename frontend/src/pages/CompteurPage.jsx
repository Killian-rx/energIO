import { useEffect, useState } from 'react';
import { Gauge, Plus, Pencil, Trash2, Loader2, Filter, Play, Square, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const ENERGIE_COLORS = {
  electricite: 'bg-yellow-100 text-yellow-800',
  gaz:         'bg-orange-100 text-orange-800',
  eau:         'bg-blue-100 text-blue-800',
  fioul:       'bg-gray-200 text-gray-800',
  bois:        'bg-amber-100 text-amber-800',
  autre:       'bg-gray-100 text-gray-700',
};
const ENERGIE_LABELS = {
  electricite: 'Électricité', gaz: 'Gaz', eau: 'Eau', fioul: 'Fioul', bois: 'Bois', autre: 'Autre',
};

const ENERGIE_UNITS = {
  electricite: 'kWh',
  gaz: 'm³',
  eau: 'm³',
  fioul: 'L',
  bois: 'kg',
  autre: 'kWh',
};

const SIM_INTERVALS = [
  { label: '30 s',  value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '15 min',value: 900 },
  { label: '1 h',   value: 3600 },
];

const SIM_RETENTIONS = [
  { label: '1 h',   value: 1 },
  { label: '6 h',   value: 6 },
  { label: '24 h',  value: 24 },
  { label: '72 h',  value: 72 },
  { label: '7 j',   value: 168 },
];

function CompteurModal({ compteur, sites, onClose, onSaved }) {
  const [form, setForm] = useState(compteur || {
    site_id: sites[0]?.id || '',
    nom: '',
    type_energie: 'electricite',
    type_compteur: 'physique',
    unite: 'kWh',
    reference: '',
    sim_active: false,
    sim_interval_seconds: 300,
    sim_retention_hours: 24,
  });

  function handleEnergieChange(e) {
    const t = e.target.value;
    setForm(f => ({
      ...f,
      type_energie: t,
      unite: f.unite === ENERGIE_UNITS[f.type_energie] ? ENERGIE_UNITS[t] || 'kWh' : f.unite,
    }));
  }
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (compteur?.id) await api.put(`/compteurs/${compteur.id}`, form);
      else await api.post('/compteurs', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">{compteur?.id ? 'Modifier le compteur' : 'Nouveau compteur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-0.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="label">Bâtiment *</label>
            <select className="input" value={form.site_id} onChange={e => setForm(f => ({...f, site_id: e.target.value}))} required>
              <option value="">— Choisir —</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nom du compteur *</label>
            <input className="input" value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Énergie *</label>
              <select className="input" value={form.type_energie} onChange={handleEnergieChange}>
                {Object.entries(ENERGIE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type_compteur} onChange={e => setForm(f => ({...f, type_compteur: e.target.value}))}>
                <option value="physique">Physique</option>
                <option value="virtuel">Virtuel</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unité</label>
              <input className="input" value={form.unite} onChange={e => setForm(f => ({...f, unite: e.target.value}))} placeholder="kWh" />
            </div>
            <div>
              <label className="label">Référence</label>
              <input className="input" value={form.reference || ''} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="ex: ELEC-001" />
            </div>
          </div>

          {/* Simulation */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Simulation</p>
                <p className="text-xs text-gray-400">Génère des relevés automatiquement</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({...f, sim_active: !f.sim_active}))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  form.sim_active ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  form.sim_active ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {form.sim_active && (
              <div className="space-y-3">
                <div>
                  <label className="label">Fréquence de collecte</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIM_INTERVALS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({...f, sim_interval_seconds: opt.value}))}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          form.sim_interval_seconds === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Rétention des données</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIM_RETENTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({...f, sim_retention_hours: opt.value}))}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                          form.sim_retention_hours === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Les données de simulation sont supprimées après la durée choisie.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {compteur?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SimToggle({ compteur, onToggle }) {
  const [busy, setBusy] = useState(false);
  const active = compteur.sim_active;

  async function toggle() {
    setBusy(true);
    try {
      await api.patch(`/compteurs/${compteur.id}/simulation`, { sim_active: !active });
      onToggle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={active ? `Simulation active — ${fmtInterval(compteur.sim_interval_seconds)}` : 'Activer la simulation'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" />
      ) : active ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {fmtInterval(compteur.sim_interval_seconds)}
        </>
      ) : (
        <Play size={11} />
      )}
    </button>
  );
}

function fmtInterval(sec) {
  if (sec < 60)   return `${sec}s`;
  if (sec < 3600) return `${sec / 60} min`;
  return `${sec / 3600}h`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt  = new Date(d);
  const now = new Date();
  const isToday     = dt.toDateString() === now.toDateString();
  const isYesterday = dt.toDateString() === new Date(now - 86_400_000).toDateString();
  const time = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday)     return time;
  if (isYesterday) return `Hier ${time}`;
  return dt.toLocaleDateString('fr-FR');
}

export default function CompteurPage() {
  const { isGestionnaire, isAdmin } = useAuth();
  const [compteurs,  setCompteurs]  = useState([]);
  const [sites,      setSites]      = useState([]);
  const [filterSite, setFilterSite] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);

  async function load() {
    try {
      const [c, s] = await Promise.all([
        api.get('/compteurs' + (filterSite ? `?site_id=${filterSite}` : '')),
        api.get('/sites'),
      ]);
      setCompteurs(c.data);
      setSites(s.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterSite]);

  async function handleDelete(id) {
    if (!confirm('Désactiver ce compteur ?')) return;
    await api.delete(`/compteurs/${id}`);
    load();
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Compteurs</h1>
          <p className="text-gray-400 text-sm mt-1">{compteurs.length} compteur{compteurs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            <select className="input w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">Tous les bâtiments</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          {isGestionnaire && (
            <button onClick={() => setModal('new')} className="btn-primary">
              <Plus size={15} /> Nouveau compteur
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Compteur</th>
                <th>Bâtiment</th>
                <th>Énergie</th>
                <th>Référence</th>
                <th>Simulation</th>
                <th>Relevés</th>
                <th>Dernier relevé</th>
                {isGestionnaire && <th></th>}
              </tr>
            </thead>
            <tbody>
              {compteurs.map(c => (
                <tr key={c.id}>
                  <td className="font-medium text-gray-900">{c.nom}</td>
                  <td className="text-gray-500">{c.site_nom}</td>
                  <td>
                    <span className={`badge ${ENERGIE_COLORS[c.type_energie]}`}>
                      {ENERGIE_LABELS[c.type_energie] ?? c.type_energie}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-gray-400">{c.reference || '—'}</td>
                  <td>
                    {isGestionnaire ? (
                      <SimToggle compteur={c} onToggle={load} />
                    ) : c.sim_active ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {fmtInterval(c.sim_interval_seconds)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="text-right text-gray-600">{parseInt(c.nb_releves).toLocaleString('fr-FR')}</td>
                  <td className="text-gray-400 text-xs">{fmtDate(c.dernier_releve)}</td>
                  {isGestionnaire && (
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Pencil size={14} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {compteurs.length === 0 && (
                <tr><td colSpan="8" className="text-center text-gray-400 py-12">Aucun compteur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CompteurModal
          compteur={modal === 'new' ? null : modal}
          sites={sites}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
