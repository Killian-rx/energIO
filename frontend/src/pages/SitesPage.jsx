import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Loader2, MapPin, Ruler } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const TYPE_LABELS = { bureau: 'Bureau', erp: 'ERP', technique: 'Technique', logement: 'Logement', autre: 'Autre' };
const TYPE_COLORS = {
  bureau:    'badge-info',
  erp:       'badge-warning',
  technique: 'badge-gray',
  logement:  'badge-success',
  autre:     'badge-gray',
};

function SiteModal({ site, onClose, onSaved }) {
  const [form, setForm] = useState(site || {
    nom: '', adresse: '', ville: '', code_postal: '',
    surface: '', type_batiment: 'bureau', usage: '', annee_construction: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (site?.id) {
        await api.put(`/sites/${site.id}`, form);
      } else {
        await api.post('/sites', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{site?.id ? 'Modifier le bâtiment' : 'Nouveau bâtiment'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <label className="label">Nom du bâtiment *</label>
            <input className="input" value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type_batiment} onChange={e => setForm(f => ({...f, type_batiment: e.target.value}))}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Surface (m²)</label>
              <input className="input" type="number" min="0" value={form.surface} onChange={e => setForm(f => ({...f, surface: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.adresse || ''} onChange={e => setForm(f => ({...f, adresse: e.target.value}))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Ville</label>
              <input className="input" value={form.ville || ''} onChange={e => setForm(f => ({...f, ville: e.target.value}))} />
            </div>
            <div>
              <label className="label">Code postal</label>
              <input className="input" value={form.code_postal || ''} onChange={e => setForm(f => ({...f, code_postal: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usage</label>
              <input className="input" value={form.usage || ''} onChange={e => setForm(f => ({...f, usage: e.target.value}))} placeholder="ex: Bureaux ouverts" />
            </div>
            <div>
              <label className="label">Année construction</label>
              <input className="input" type="number" min="1800" max="2030" value={form.annee_construction || ''} onChange={e => setForm(f => ({...f, annee_construction: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {site?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SitesPage() {
  const { isGestionnaire, isAdmin } = useAuth();
  const [sites, setSites]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null); // null | 'new' | site object

  async function loadSites() {
    try {
      const { data } = await api.get('/sites');
      setSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSites(); }, []);

  async function handleDelete(id) {
    if (!confirm('Désactiver ce bâtiment ?')) return;
    await api.delete(`/sites/${id}`);
    loadSites();
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bâtiments</h1>
          <p className="text-gray-500 text-sm mt-1">{sites.length} site{sites.length !== 1 ? 's' : ''} actif{sites.length !== 1 ? 's' : ''}</p>
        </div>
        {isGestionnaire && (
          <button onClick={() => setModal('new')} className="btn-primary">
            <Plus size={16} /> Nouveau bâtiment
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map(site => (
            <div key={site.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{site.nom}</h3>
                    <span className={TYPE_COLORS[site.type_batiment] || 'badge-gray'}>
                      {TYPE_LABELS[site.type_batiment] || site.type_batiment}
                    </span>
                  </div>
                </div>
                {isGestionnaire && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(site)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                      <Pencil size={15} />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(site.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                {(site.ville || site.adresse) && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate">{[site.adresse, site.ville, site.code_postal].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {site.surface && (
                  <div className="flex items-center gap-2">
                    <Ruler size={14} className="shrink-0 text-gray-400" />
                    <span>{parseFloat(site.surface).toLocaleString('fr-FR')} m²</span>
                  </div>
                )}
                {site.usage && (
                  <p className="text-xs text-gray-500 italic truncate">{site.usage}</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{site.nb_compteurs} compteur{site.nb_compteurs !== '1' ? 's' : ''}</span>
                {site.annee_construction && <span>Construction {site.annee_construction}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <SiteModal
          site={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadSites(); }}
        />
      )}
    </div>
  );
}
