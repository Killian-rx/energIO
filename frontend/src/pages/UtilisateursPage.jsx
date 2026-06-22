import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const ROLE_BADGE  = {
  admin:        'bg-purple-100 text-purple-800',
  gestionnaire: 'bg-blue-100 text-blue-800',
  utilisateur:  'bg-gray-100 text-gray-700',
};
const ROLE_LABEL  = { admin: 'Admin', gestionnaire: 'Gestionnaire', utilisateur: 'Utilisateur' };

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState(user || {
    nom: '', prenom: '', email: '', password: '', role: 'utilisateur', actif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (user?.id) {
        await api.put(`/utilisateurs/${user.id}`, form);
      } else {
        await api.post('/auth/register', { ...form });
      }
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
          <h2 className="text-lg font-semibold">{user?.id ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-0.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={form.prenom} onChange={e => setForm(f => ({...f, prenom: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} required />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required disabled={!!user?.id} />
          </div>
          <div>
            <label className="label">{user?.id ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe *'}</label>
            <input className="input" type="password" value={form.password || ''} onChange={e => setForm(f => ({...f, password: e.target.value}))} required={!user?.id} minLength={6} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="utilisateur">Utilisateur</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {user?.id && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({...f, actif: e.target.checked}))} />
                  <span className="text-sm text-gray-700">Compte actif</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {user?.id ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);

  async function load() {
    try {
      const { data } = await api.get('/utilisateurs');
      setUsers(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Désactiver ce compte ?')) return;
    await api.delete(`/utilisateurs/${id}`);
    load();
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} compte{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-auto w-full">
            <thead><tr>
              <th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Depuis</th><th></th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={!u.actif ? 'opacity-50' : ''}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                        {u.id === currentUser?.id && <p className="text-xs text-blue-500">Vous</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-600 text-sm">{u.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role] ?? u.role}</span>
                  </td>
                  <td>
                    {u.actif
                      ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle size={12} />Actif</span>
                      : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={12} />Inactif</span>
                    }
                  </td>
                  <td className="text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setModal(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Pencil size={14} />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
