const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

const siteFields = [
  body('nom').notEmpty().trim(),
  body('surface').optional().isFloat({ min: 0 }),
  body('type_batiment').optional().isIn(['bureau','erp','technique','logement','autre']),
  body('annee_construction').optional().isInt({ min: 1800, max: 2030 }),
];

// GET /sites
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
             u.nom || ' ' || u.prenom AS gestionnaire_nom,
             COUNT(DISTINCT c.id)      AS nb_compteurs
      FROM site s
      LEFT JOIN utilisateur u ON s.gestionnaire_id = u.id
      LEFT JOIN compteur c    ON c.site_id = s.id AND c.actif = TRUE
      WHERE s.actif = TRUE
      GROUP BY s.id, u.nom, u.prenom
      ORDER BY s.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /sites/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, u.nom || ' ' || u.prenom AS gestionnaire_nom
      FROM site s
      LEFT JOIN utilisateur u ON s.gestionnaire_id = u.id
      WHERE s.id = $1 AND s.actif = TRUE
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Site non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /sites (gestionnaire+)
router.post('/', requireRole('gestionnaire'), ...siteFields, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO site (nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction, gestionnaire_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /sites/:id (gestionnaire+)
router.put('/:id', requireRole('gestionnaire'), ...siteFields, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE site SET nom=$1, adresse=$2, ville=$3, code_postal=$4,
        surface=$5, type_batiment=$6, usage=$7, annee_construction=$8
      WHERE id=$9 AND actif=TRUE RETURNING *
    `, [nom, adresse, ville, code_postal, surface, type_batiment, usage, annee_construction, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Site non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /sites/:id (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE site SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Site désactivé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
