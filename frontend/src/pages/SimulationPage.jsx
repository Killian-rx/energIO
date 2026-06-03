import { useEffect, useState, useRef } from 'react';
import {
  Play, Square, RefreshCw, Radio, Clock, Zap, Droplets,
  Flame, Activity, Loader2,
} from 'lucide-react';
import api from '../api/client';

const INTERVALS = [
  { label: '30 sec', value: 30 },
  { label: '1 min',  value: 60 },
  { label: '2 min',  value: 120 },
  { label: '5 min',  value: 300 },
  { label: '15 min', value: 900 },
  { label: '30 min', value: 1800 },
  { label: '1 heure',value: 3600 },
];

const ENERGIE_STYLE = {
  electricite: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Zap },
  gaz:         { color: 'text-orange-600', bg: 'bg-orange-50', icon: Flame },
  eau:         { color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Droplets },
  fioul:       { color: 'text-gray-600',   bg: 'bg-gray-50',   icon: Activity },
  bois:        { color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Flame },
};

function useCountdown(nextRunAt) {
  const [secs, setSecs] = useState(null);
  useEffect(() => {
    if (!nextRunAt) { setSecs(null); return; }
    const update = () => {
      const diff = Math.max(0, Math.round((new Date(nextRunAt) - Date.now()) / 1000));
      setSecs(diff);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [nextRunAt]);
  return secs;
}

export default function SimulationPage() {
  const [status,   setStatus]   = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [interval, setIntervalVal] = useState(300);
  const pollRef = useRef(null);
  const countdown = useCountdown(status?.nextRunAt);

  async function fetchStatus() {
    const [s, r] = await Promise.all([
      api.get('/simulation/status'),
      api.get('/simulation/recent'),
    ]);
    setStatus(s.data);
    setReadings(r.data);
    setIntervalVal(s.data.intervalSeconds);
  }

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleStart() {
    setLoading(true);
    await api.post('/simulation/start', { intervalSeconds: interval });
    await fetchStatus();
    setLoading(false);
  }

  async function handleStop() {
    setLoading(true);
    await api.post('/simulation/stop');
    await fetchStatus();
    setLoading(false);
  }

  async function handleTick() {
    setLoading(true);
    await api.post('/simulation/tick');
    await fetchStatus();
    setLoading(false);
  }

  async function handleIntervalChange(newVal) {
    setIntervalVal(newVal);
    if (status?.active) {
      await api.patch('/simulation/interval', { intervalSeconds: newVal });
      await fetchStatus();
    }
  }

  const isActive = status?.active;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Simulation temps réel</h1>
        {status && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'En cours' : 'Arrêtée'}
          </span>
        )}
      </div>

      {/* Panneau de contrôle */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Configuration</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="label">Intervalle de collecte</label>
            <div className="flex gap-1.5 flex-wrap">
              {INTERVALS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleIntervalChange(opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    interval === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleTick}
              disabled={loading}
              title="Générer un relevé maintenant"
              className="btn-secondary"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Relevé manuel
            </button>
            {isActive ? (
              <button onClick={handleStop} disabled={loading} className="btn-danger">
                <Square size={15} /> Arrêter
              </button>
            ) : (
              <button onClick={handleStart} disabled={loading} className="btn-primary">
                <Play size={15} /> Démarrer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Relevés générés</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {status.totalGenerated.toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Intervalle</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {interval < 60
                ? `${interval}s`
                : interval < 3600
                  ? `${interval / 60} min`
                  : `${interval / 3600}h`}
            </p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Dernier relevé</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {status.lastRunAt
                ? new Date(status.lastRunAt).toLocaleTimeString('fr-FR')
                : '—'}
            </p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Clock size={11} /> Prochain relevé
            </p>
            <p className={`text-2xl font-bold mt-1 ${isActive ? 'text-blue-600' : 'text-gray-300'}`}>
              {isActive && countdown !== null ? `${countdown}s` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Live feed */}
      <div className="card p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Radio size={14} className={isActive ? 'text-emerald-500 animate-pulse' : 'text-gray-300'} />
          <h2 className="text-sm font-semibold text-gray-700">Flux en direct</h2>
          <span className="text-xs text-gray-400 ml-auto">Actualisation toutes les 3s</span>
        </div>
        {readings.length === 0 ? (
          <div className="px-5 py-10 text-sm text-gray-400">
            Aucun relevé simulé — démarrez la simulation ou générez un relevé manuel.
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            {readings.map((r, i) => {
              const cfg = ENERGIE_STYLE[r.type_energie] || ENERGIE_STYLE.electricite;
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                    <Icon size={13} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{r.compteur_nom}</span>
                    <span className="text-xs text-gray-400 ml-2">{r.site_nom}</span>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${cfg.color}`}>
                    {r.valeur} {r.unite}
                  </span>
                  <span className="text-xs text-gray-400 w-20 text-right">
                    {new Date(r.at).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
