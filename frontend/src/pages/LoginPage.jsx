import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role) {
    const accounts = {
      admin:        { email: 'admin@energio.fr',        password: 'password' },
      gestionnaire: { email: 'gestionnaire@energio.fr', password: 'password' },
      utilisateur:  { email: 'utilisateur@energio.fr',  password: 'password' },
    };
    setForm(accounts[role]);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-4 shadow-lg">
            <Zap size={32} className="text-blue-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">EnergIO</h1>
          <p className="text-blue-200 mt-1">Plateforme de gestion énergétique</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Connexion</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                className="input"
                placeholder="vous@exemple.fr"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Se connecter
            </button>
          </form>

          {/* Comptes démo */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-medium">Comptes de démonstration :</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'admin',        label: 'Admin',        color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                { role: 'gestionnaire', label: 'Gestionnaire', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                { role: 'utilisateur',  label: 'Utilisateur',  color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              ].map(({ role, label, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-colors ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Mot de passe : <code className="bg-gray-100 px-1 rounded">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
