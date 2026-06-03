import { useEffect, useRef, useState } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import api from '../api/client';

export default function ImportPage() {
  const [historique, setHistorique] = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [dragOver, setDragOver]     = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [exportForm, setExportForm] = useState({ from: '', to: '' });
  const fileRef = useRef();

  async function loadHistory() {
    try {
      const { data } = await api.get('/import/historique');
      setHistorique(data);
    } catch {}
  }

  useEffect(() => { loadHistory(); }, []);

  async function handleUpload(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Seuls les fichiers .csv sont acceptés');
      return;
    }
    setUploading(true);
    setResult(null);
    setError('');
    const fd = new FormData();
    fd.append('fichier', file);
    try {
      const { data } = await api.post('/import/releves', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams(exportForm).toString();
      const response = await api.get('/import/export/releves?' + params, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_releves_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  }

  async function handleTemplateDownload() {
    try {
      const response = await api.get('/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'template_releves.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import / Export</h1>
        <p className="text-gray-500 text-sm mt-1">Intégration de données depuis des fichiers CSV tiers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={18} className="text-blue-600" /> Importer des relevés
          </h2>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
            ) : (
              <>
                <FileText size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Déposez un fichier CSV ici</p>
                <p className="text-xs text-gray-400 mt-1">ou cliquez pour parcourir (max 5 Mo)</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleUpload(e.target.files[0])} />
          </div>

          <button onClick={handleTemplateDownload} className="btn-secondary w-full justify-center text-sm">
            <Download size={14} /> Télécharger le modèle CSV
          </button>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-2">
                <CheckCircle size={16} /> Import terminé
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-gray-400">Total</p>
                  <p className="font-bold text-gray-800">{result.nb_total}</p>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-emerald-600">Importés</p>
                  <p className="font-bold text-emerald-700">{result.nb_ok}</p>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-red-500">Erreurs</p>
                  <p className="font-bold text-red-600">{result.nb_erreurs}</p>
                </div>
              </div>
              {result.erreurs?.length > 0 && (
                <div className="mt-3 max-h-24 overflow-y-auto">
                  {result.erreurs.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">Ligne {e.ligne} : {e.erreur}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Download size={18} className="text-emerald-600" /> Exporter les relevés
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">Période de</label>
              <input type="month" className="input" value={exportForm.from}
                onChange={e => setExportForm(f => ({...f, from: e.target.value}))} />
            </div>
            <div>
              <label className="label">Période jusqu'au</label>
              <input type="month" className="input" value={exportForm.to}
                onChange={e => setExportForm(f => ({...f, to: e.target.value}))} />
            </div>
            <button onClick={handleExport} disabled={exporting} className="btn-success w-full justify-center">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exporter en CSV
            </button>
          </div>
          <p className="text-xs text-gray-400">Format : site, référence, énergie, date, valeur, unité, source, note</p>
        </div>
      </div>

      {/* Historique */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-500" /> Historique des imports
        </h2>
        {historique.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Aucun import effectué</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead><tr>
                <th>Fichier</th><th>Date</th><th>Par</th>
                <th>Total</th><th>OK</th><th>Erreurs</th><th>Statut</th>
              </tr></thead>
              <tbody>
                {historique.map(h => (
                  <tr key={h.id}>
                    <td className="font-mono text-xs">{h.nom_fichier}</td>
                    <td className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString('fr-FR')}</td>
                    <td className="text-sm text-gray-600">{h.importe_par_nom || '—'}</td>
                    <td className="text-right">{h.nb_lignes_total}</td>
                    <td className="text-right text-emerald-600">{h.nb_lignes_ok}</td>
                    <td className="text-right text-red-500">{h.nb_lignes_erreur}</td>
                    <td>
                      <span className={
                        h.statut === 'termine' ? 'badge-success' :
                        h.statut === 'erreur'  ? 'badge-critical' : 'badge-warning'
                      }>{h.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
