import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Pencil, Trash2, Power, Loader2, X } from 'lucide-react';
import api from '../api/client';

const TYPE_LABELS  = { seuil_absolu: 'Seuil absolu', variation: 'Variation %', comparaison: 'Comparaison' };
const NIVEAU_LABEL = { info: 'Info', warning: 'Alerte', critical: 'Critique' };
const NIVEAU_BADGE = { info: 'badge-info', warning: 'badge-warning', critical: 'badge-critical' };

function RegleModal({ regle, sites, compteurs, onClose, onSaved }) {
  const [form, setForm] = useState(regle ? {
    nom: regle.nom, site_id: regle.site_id || '', compteur_id: regle.compteur_id || '',
    type_regle: regle.type_regle, condition: regle.condition, niveau: regle.niveau, active: regle.active,
  } : {
    nom: '', site_id: '', compteur_id: '', type_regle: 'seuil_absolu',
    condition: { seuil: '' }, niveau: 'warning', active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getConditionField() {
    switch (form.type_regle) {
      case 'seuil_absolu': return (
        <div>
          <label className="label">Seuil (valeur absolue)</label>
          <input className="input" type="number" value={form.condition.seuil || ''}
            onChange={e => setForm(f => ({...f, condition: { seuil: parseFloat(e.target.value) }}))} />
        </div>
      );
      case 'variation': return (
        <div>
          <label className="label">Variation max autorisée (%)</label>
          <input className="input" type="number" value={form.condition.seuil_pct || ''}
            onChange={e => setForm(f => ({...f, condition: { seuil_pct: parseFloat(e.target.value) }}))} />
        </div>
      );
      case 'comparaison': return (
        <div>
          <label className="label">Écart max vs référence (%)</label>
          <input className="input" type="number" value={form.condition.delta_pct || ''}
            onChange={e => setForm(f => ({...f, condition: { delta_pct: parseFloat(e.target.value) }}))} />
        </div>
      );
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, site_id: form.site_id || null, compteur_id: form.compteur_id || null };
      if (regle?.id) await api.put(`/regles/${regle.id}`, payload);
      else await api.post('/regles', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{regle?.id ? 'Modifier la règle' : 'Nouvelle règle d\'alerte'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-0.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <label className="label">Nom de la règle *</label>
            <input className="input" value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type de règle</label>
              <select className="input" value={form.type_regle}
                onChange={e => setForm(f => ({...f, type_regle: e.target.value, condition: {}}))}>
                {Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Niveau</label>
              <select className="input" value={form.niveau} onChange={e => setForm(f => ({...f, niveau: e.target.value}))}>
                <option value="info">Info</option>
                <option value="warning">Alerte</option>
                <option value="critical">Critique</option>
              </select>
            </div>
          </div>
          {getConditionField()}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bâtiment (optionnel)</label>
              <select className="input" value={form.site_id} onChange={e => setForm(f => ({...f, site_id: e.target.value}))}>
                <option value="">Tous les bâtiments</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Compteur (optionnel)</label>
              <select className="input" value={form.compteur_id} onChange={e => setForm(f => ({...f, compteur_id: e.target.value}))}>
                <option value="">Tous les compteurs</option>
                {compteurs.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.site_nom})</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {regle?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReglesPage() {
  const [regles, setRegles]       = useState([]);
  const [sites, setSites]         = useState([]);
  const [compteurs, setCompteurs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  async function load() {
    try {
      const [r, s, c] = await Promise.all([
        api.get('/regles'), api.get('/sites'), api.get('/compteurs'),
      ]);
      setRegles(r.data); setSites(s.data); setCompteurs(c.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id) {
    await api.patch(`/regles/${id}/toggle`);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette règle ?')) return;
    await api.delete(`/regles/${id}`);
    load();
  }

  async function handleEvaluer() {
    setEvaluating(true);
    try {
      const { data } = await api.post('/regles/evaluer');
      setEvalResult(data);
      load();
    } finally { setEvaluating(false); }
  }

  function formatCondition(type, cond) {
    if (!cond) return '';
    if (type === 'seuil_absolu') return `> ${cond.seuil?.toLocaleString('fr-FR')}`;
    if (type === 'variation')    return `var. > ${cond.seuil_pct}%`;
    if (type === 'comparaison')  return `écart > +${cond.delta_pct}%`;
    return JSON.stringify(cond);
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Règles d'alerte</h1>
          <p className="text-gray-500 text-sm mt-1">{regles.filter(r=>r.active).length} actives sur {regles.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleEvaluer} disabled={evaluating} className="btn-secondary">
            {evaluating ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
            Évaluer maintenant
          </button>
          <button onClick={() => setModal('new')} className="btn-primary">
            <Plus size={16} /> Nouvelle règle
          </button>
        </div>
      </div>

      {evalResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          Évaluation terminée : <strong>{evalResult.alertes_creees}</strong> nouvelle{evalResult.alertes_creees !== 1 ? 's' : ''} alerte{evalResult.alertes_creees !== 1 ? 's' : ''} créée{evalResult.alertes_creees !== 1 ? 's' : ''}.
          <button onClick={() => setEvalResult(null)} className="ml-3 text-blue-500 hover:text-blue-700">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-auto w-full">
            <thead><tr>
              <th>Règle</th><th>Type</th><th>Condition</th>
              <th>Bâtiment</th><th>Niveau</th><th>Statut</th><th>Créée par</th><th></th>
            </tr></thead>
            <tbody>
              {regles.map(r => (
                <tr key={r.id} className={!r.active ? 'opacity-50' : ''}>
                  <td className="font-medium text-gray-900">{r.nom}</td>
                  <td><span className="badge-gray">{TYPE_LABELS[r.type_regle]}</span></td>
                  <td className="font-mono text-xs text-gray-600">{formatCondition(r.type_regle, r.condition)}</td>
                  <td className="text-gray-500 text-sm">{r.site_nom || 'Tous'}</td>
                  <td><span className={NIVEAU_BADGE[r.niveau]}>{NIVEAU_LABEL[r.niveau] ?? r.niveau}</span></td>
                  <td>
                    <span className={r.active ? 'badge-success' : 'badge-gray'}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-gray-500 text-xs">{r.createur || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggle(r.id)} title={r.active ? 'Désactiver' : 'Activer'}
                        className={`p-1.5 rounded hover:bg-gray-100 ${r.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => setModal(r)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {regles.length === 0 && (
                <tr><td colSpan="8" className="text-center text-gray-400 py-12">Aucune règle configurée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <RegleModal
          regle={modal === 'new' ? null : modal}
          sites={sites} compteurs={compteurs}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
