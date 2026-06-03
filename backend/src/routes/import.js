const express   = require('express');
const multer    = require('multer');
const { parse } = require('csv-parse');
const pool      = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth, requireRole('gestionnaire'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Seuls les fichiers CSV sont acceptés'));
  },
});

// POST /import/releves — importe un CSV de relevés
// Format attendu : compteur_reference,date_releve,valeur,note
router.post('/releves', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier CSV requis' });

  const client = await pool.connect();
  let importLog = null;

  try {
    // Créer le log d'import
    const { rows: [log] } = await client.query(`
      INSERT INTO import_log (nom_fichier, type_import, statut, importe_par)
      VALUES ($1, 'csv_releves', 'en_cours', $2) RETURNING id
    `, [req.file.originalname, req.user.id]);
    importLog = log.id;

    // Parser le CSV
    const records = await new Promise((resolve, reject) => {
      const rows = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
      parser.on('readable', () => {
        let rec;
        while ((rec = parser.read()) !== null) rows.push(rec);
      });
      parser.on('error', reject);
      parser.on('end', () => resolve(rows));
      parser.write(req.file.buffer);
      parser.end();
    });

    // Récupérer la table de correspondance reference -> compteur_id
    const { rows: compteurs } = await client.query(
      'SELECT id, reference FROM compteur WHERE actif=TRUE AND reference IS NOT NULL'
    );
    const refMap = {};
    for (const c of compteurs) refMap[c.reference] = c.id;

    await client.query('BEGIN');

    let ok = 0, erreurs = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const lineNum = i + 2; // +2 car ligne 1 = headers

      const ref    = r.compteur_reference || r.reference || r.compteur;
      const date   = r.date_releve || r.date;
      const valeur = parseFloat(r.valeur || r.value);
      const note   = r.note || r.commentaire || '';

      if (!ref || !date || isNaN(valeur)) {
        erreurs.push({ ligne: lineNum, erreur: 'Champs obligatoires manquants (reference, date, valeur)' });
        continue;
      }

      const compteurId = refMap[ref];
      if (!compteurId) {
        erreurs.push({ ligne: lineNum, erreur: `Référence compteur inconnue: ${ref}` });
        continue;
      }

      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        erreurs.push({ ligne: lineNum, erreur: `Date invalide: ${date}` });
        continue;
      }

      await client.query(`
        INSERT INTO releve (compteur_id, valeur, date_releve, source, import_id, note)
        VALUES ($1, $2, $3, 'import', $4, $5)
      `, [compteurId, valeur, dateObj.toISOString(), importLog, note]);
      ok++;
    }

    await client.query('COMMIT');

    // Mettre à jour le log
    await client.query(`
      UPDATE import_log
      SET statut='termine', nb_lignes_total=$1, nb_lignes_ok=$2,
          nb_lignes_erreur=$3, erreurs=$4
      WHERE id=$5
    `, [records.length, ok, erreurs.length, JSON.stringify(erreurs), importLog]);

    res.json({
      import_id: importLog,
      nb_total: records.length,
      nb_ok: ok,
      nb_erreurs: erreurs.length,
      erreurs: erreurs.slice(0, 20), // max 20 erreurs retournées
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (importLog) {
      await client.query(`
        UPDATE import_log SET statut='erreur', erreurs=$1 WHERE id=$2
      `, [JSON.stringify([{ erreur: err.message }]), importLog]).catch(() => {});
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'import: ' + err.message });
  } finally {
    client.release();
  }
});

// GET /import/template — télécharger le template CSV
router.get('/template', (_, res) => {
  const csv = [
    'compteur_reference,date_releve,valeur,note',
    'ELEC-001-PARIS,2026-01-05,28500,Relevé manuel janvier',
    'GAZ-001-PARIS,2026-01-05,14200,',
    'ELEC-002-LYON,2026-01-06,46800,',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template_releves.csv"');
  res.send('﻿' + csv); // BOM UTF-8 pour Excel
});

// GET /import/historique — journal des imports
router.get('/historique', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT il.*, u.nom || ' ' || u.prenom AS importe_par_nom
      FROM import_log il
      LEFT JOIN utilisateur u ON il.importe_par = u.id
      ORDER BY il.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /import/export/releves?from=YYYY-MM&to=YYYY-MM — export CSV
router.get('/export/releves', requireRole('gestionnaire'), async (req, res) => {
  try {
    const { from, to, site_id } = req.query;
    const conditions = ['r.valide = TRUE'];
    const params = [];

    if (from)    { params.push(from + '-01'); conditions.push(`r.date_releve >= $${params.length}::DATE`); }
    if (to)      { params.push(to + '-01');   conditions.push(`r.date_releve < ($${params.length}::DATE + INTERVAL '1 month')`); }
    if (site_id) { params.push(site_id);      conditions.push(`c.site_id = $${params.length}`); }

    const { rows } = await pool.query(`
      SELECT s.nom AS site, c.reference, c.nom AS compteur, c.type_energie,
             TO_CHAR(r.date_releve, 'YYYY-MM-DD') AS date_releve,
             r.valeur, c.unite, r.source, r.note
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      JOIN site s ON c.site_id = s.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.nom, c.nom, r.date_releve
    `, params);

    const headers = 'site,compteur_reference,compteur_nom,type_energie,date_releve,valeur,unite,source,note';
    const lines = rows.map(r =>
      [r.site, r.reference, r.compteur, r.type_energie,
       r.date_releve, r.valeur, r.unite, r.source, r.note || ''].join(',')
    );
    const csv = '﻿' + [headers, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export_releves_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur export' });
  }
});

module.exports = router;
