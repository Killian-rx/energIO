import { useEffect, useState } from 'react';
import { Gauge, Plus, Pencil, Trash2, Loader2, Filter } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const ENERGIE_ICONS = { electricite: '⚡', gaz: '🔥', eau: '💧', fioul: '🛢️', bois: '🪵', autre: '⚙️' };
const ENERGIE_COLORS = {
  electricite: 'bg-yellow-100 text-yellow-800',
  gaz:         'bg-orange-100 text-orange-800',
  eau:         'bg-blue-100 text-blue-800',
  fioul:       'bg-gray-200 text-gray-800',
  bois:        'bg-amber-100 text-amber-800',
  autre:       'bg-gray-100 text-gray-700',
};

function CompteurModal({ compteur, sites, onClose, onSaved }) {
  const [form, setForm] = useState(compteur || {
    site_id: sites[0]?.id || '', nom: '', type_energie: 'electricite',
    type_compteur: 'physique', unite: 'kWh', reference: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{compteur?.id ? 'Modifier' : 'Nouveau compteur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <select className="input" value={form.type_energie} onChange={e => setForm(f => ({...f, type_energie: e.target.value}))}>
                {['electricite','gaz','eau','fioul','bois','autre'].map(t => (
                  <option key={t} value={t}>{ENERGIE_ICONS[t]} {t}</option>
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
          <div className="flex gap-3 justify-end pt-2">
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

export default function CompteurPage() {
  const { isGestionnaire, isAdmin } = useAuth();
  const [compteurs, setCompteurs] = useState([]);
  const [sites, setSites]         = useState([]);
  const [filterSite, setFilterSite] = useState('');
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);

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
          <h1 className="text-2xl font-bold text-gray-900">Compteurs</h1>
          <p className="text-gray-500 text-sm mt-1">{compteurs.length} compteur{compteurs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select className="input w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">Tous les bâtiments</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          {isGestionnaire && (
            <button onClick={() => setModal('new')} className="btn-primary">
              <Plus size={16} /> Nouveau compteur
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <th>Compteur</th>
                <th>Bâtiment</th>
                <th>Énergie</th>
                <th>Type</th>
                <th>Référence</th>
                <th>Relevés</th>
                <th>Dernier relevé</th>
                {isGestionnaire && <th></th>}
              </tr>
            </thead>
            <tbody>
              {compteurs.map(c => (
                <tr key={c.id}>
                  <td className="font-medium text-gray-900">{c.nom}</td>
                  <td className="text-gray-600">{c.site_nom}</td>
                  <td>
                    <span className={`badge ${ENERGIE_COLORS[c.type_energie]}`}>
                      {ENERGIE_ICONS[c.type_energie]} {c.type_energie}
                    </span>
                  </td>
                  <td className="capitalize text-gray-600">{c.type_compteur}</td>
                  <td className="font-mono text-xs text-gray-500">{c.reference || '—'}</td>
                  <td className="text-right">{parseInt(c.nb_releves).toLocaleString('fr-FR')}</td>
                  <td className="text-gray-500 text-xs">
                    {c.dernier_releve ? new Date(c.dernier_releve).toLocaleDateString('fr-FR') : '—'}
                  </td>
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
