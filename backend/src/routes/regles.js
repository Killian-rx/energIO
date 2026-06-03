const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { evaluerToutesRegles } = require('../services/alerteService');

const router = express.Router();
router.use(requireAuth);

// GET /regles
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ra.*, s.nom AS site_nom, c.nom AS compteur_nom,
             u.nom || ' ' || u.prenom AS createur
      FROM regle_alerte ra
      LEFT JOIN site s ON ra.site_id = s.id
      LEFT JOIN compteur c ON ra.compteur_id = c.id
      LEFT JOIN utilisateur u ON ra.created_by = u.id
      ORDER BY ra.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /regles (gestionnaire+)
router.post('/',
  requireRole('gestionnaire'),
  body('nom').notEmpty().trim(),
  body('type_regle').isIn(['seuil_absolu','variation','comparaison']),
  body('condition').isObject(),
  body('niveau').optional().isIn(['info','warning','critical']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nom, site_id, compteur_id, type_regle, condition, niveau } = req.body;
    try {
      const { rows } = await pool.query(`
        INSERT INTO regle_alerte (nom, site_id, compteur_id, type_regle, condition, niveau, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
      `, [nom, site_id || null, compteur_id || null, type_regle,
          JSON.stringify(condition), niveau || 'warning', req.user.id]);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// PUT /regles/:id (gestionnaire+)
router.put('/:id', requireRole('gestionnaire'),
  body('nom').notEmpty().trim(),
  body('type_regle').isIn(['seuil_absolu','variation','comparaison']),
  body('condition').isObject(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nom, site_id, compteur_id, type_regle, condition, niveau, active } = req.body;
    try {
      const { rows } = await pool.query(`
        UPDATE regle_alerte
        SET nom=$1, site_id=$2, compteur_id=$3, type_regle=$4,
            condition=$5, niveau=$6, active=$7
        WHERE id=$8 RETURNING *
      `, [nom, site_id || null, compteur_id || null, type_regle,
          JSON.stringify(condition), niveau || 'warning', active !== false, req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Règle non trouvée' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// PATCH /regles/:id/toggle (gestionnaire+)
router.patch('/:id/toggle', requireRole('gestionnaire'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE regle_alerte SET active = NOT active WHERE id=$1 RETURNING id, active
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Règle non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /regles/:id (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM regle_alerte WHERE id=$1', [req.params.id]);
    res.json({ message: 'Règle supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /regles/evaluer — déclenche l'évaluation manuelle (admin/gestionnaire)
router.post('/evaluer', requireRole('gestionnaire'), async (req, res) => {
  try {
    const alertes = await evaluerToutesRegles();
    res.json({ alertes_creees: alertes.length, alertes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l\'évaluation' });
  }
});

module.exports = router;
