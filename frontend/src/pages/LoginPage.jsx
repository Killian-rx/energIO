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
    <div className="min-h-screen flex items-center justify-center bg-blue-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-400 rounded-xl mb-4">
            <Zap size={28} className="text-blue-900" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EnergIO</h1>
          <p className="text-blue-400 text-sm mt-1">Gestion énergétique</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Connexion</h2>

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

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Accès rapide — démo</p>
            <div className="flex gap-2">
              {[
                { role: 'admin',        label: 'Admin' },
                { role: 'gestionnaire', label: 'Gestionnaire' },
                { role: 'utilisateur',  label: 'Utilisateur' },
              ].map(({ role, label }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(role)}
                  className="text-xs py-1 px-2.5 rounded border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
