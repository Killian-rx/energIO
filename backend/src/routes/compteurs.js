const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

// GET /compteurs?site_id=X
router.get('/', async (req, res) => {
  try {
    const { site_id } = req.query;
    const params = site_id ? [site_id] : [];
    const where  = site_id ? 'AND c.site_id = $1' : '';
    const { rows } = await pool.query(`
      SELECT c.*, s.nom AS site_nom,
             (SELECT COUNT(*) FROM releve r WHERE r.compteur_id = c.id) AS nb_releves,
             (SELECT MAX(date_releve) FROM releve r WHERE r.compteur_id = c.id) AS dernier_releve
      FROM compteur c
      JOIN site s ON c.site_id = s.id
      WHERE c.actif = TRUE ${where}
      ORDER BY s.nom, c.type_energie, c.nom
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /compteurs/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, s.nom AS site_nom
      FROM compteur c JOIN site s ON c.site_id = s.id
      WHERE c.id = $1 AND c.actif = TRUE
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Compteur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /compteurs (gestionnaire+)
router.post('/',
  requireRole('gestionnaire'),
  body('site_id').isInt(),
  body('nom').notEmpty().trim(),
  body('type_energie').isIn(['electricite','gaz','eau','fioul','bois','autre']),
  body('type_compteur').optional().isIn(['physique','virtuel']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { site_id, nom, type_energie, type_compteur, unite, reference } = req.body;
    try {
      const { rows } = await pool.query(`
        INSERT INTO compteur (site_id, nom, type_energie, type_compteur, unite, reference)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [site_id, nom, type_energie, type_compteur || 'physique', unite || 'kWh', reference]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// PUT /compteurs/:id (gestionnaire+)
router.put('/:id', requireRole('gestionnaire'),
  body('nom').notEmpty().trim(),
  body('type_energie').isIn(['electricite','gaz','eau','fioul','bois','autre']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nom, type_energie, type_compteur, unite, reference } = req.body;
    try {
      const { rows } = await pool.query(`
        UPDATE compteur SET nom=$1, type_energie=$2, type_compteur=$3, unite=$4, reference=$5
        WHERE id=$6 AND actif=TRUE RETURNING *
      `, [nom, type_energie, type_compteur || 'physique', unite || 'kWh', reference, req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Compteur non trouvé' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// DELETE /compteurs/:id (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE compteur SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Compteur désactivé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
