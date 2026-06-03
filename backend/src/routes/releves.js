const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

// GET /releves?compteur_id=X&from=YYYY-MM&to=YYYY-MM&limit=100
router.get('/', async (req, res) => {
  try {
    const { compteur_id, from, to, limit = 200 } = req.query;
    const conditions = ['r.valide = TRUE'];
    const params = [];

    if (compteur_id) { params.push(compteur_id); conditions.push(`r.compteur_id = $${params.length}`); }
    if (from)        { params.push(from + '-01'); conditions.push(`r.date_releve >= $${params.length}::DATE`); }
    if (to)          { params.push(to + '-01');   conditions.push(`r.date_releve < ($${params.length}::DATE + INTERVAL '1 month')`); }

    params.push(Math.min(parseInt(limit) || 200, 1000));
    const { rows } = await pool.query(`
      SELECT r.*, c.nom AS compteur_nom, c.type_energie, c.unite, s.nom AS site_nom
      FROM releve r
      JOIN compteur c ON r.compteur_id = c.id
      JOIN site s     ON c.site_id = s.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.date_releve DESC
      LIMIT $${params.length}
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /releves (gestionnaire+)
router.post('/',
  requireRole('gestionnaire'),
  body('compteur_id').isInt(),
  body('valeur').isFloat(),
  body('date_releve').isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { compteur_id, valeur, date_releve, source, note } = req.body;
    try {
      const { rows } = await pool.query(`
        INSERT INTO releve (compteur_id, valeur, date_releve, source, note)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [compteur_id, valeur, date_releve, source || 'manuel', note]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// DELETE /releves/:id (gestionnaire+) — invalidation logique
router.delete('/:id', requireRole('gestionnaire'), async (req, res) => {
  try {
    await pool.query('UPDATE releve SET valide=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Relevé invalidé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
