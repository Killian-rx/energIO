const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const sim = require('../services/simulationService');

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

    const {
      site_id, nom, type_energie, type_compteur, unite, reference,
      sim_active = false, sim_interval_seconds = 300, sim_retention_hours = 24,
    } = req.body;
    try {
      const { rows } = await pool.query(`
        INSERT INTO compteur
          (site_id, nom, type_energie, type_compteur, unite, reference,
           sim_active, sim_interval_seconds, sim_retention_hours)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [
        site_id, nom, type_energie, type_compteur || 'physique', unite || 'kWh', reference,
        !!sim_active, parseInt(sim_interval_seconds), parseInt(sim_retention_hours),
      ]);
      const compteur = rows[0];
      if (compteur.sim_active) startSim(compteur);
      res.status(201).json(compteur);
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

    const {
      nom, type_energie, type_compteur, unite, reference,
      sim_active, sim_interval_seconds, sim_retention_hours,
    } = req.body;
    try {
      const { rows } = await pool.query(`
        UPDATE compteur
        SET nom=$1, type_energie=$2, type_compteur=$3, unite=$4, reference=$5,
            sim_active=COALESCE($6, sim_active),
            sim_interval_seconds=COALESCE($7, sim_interval_seconds),
            sim_retention_hours=COALESCE($8, sim_retention_hours)
        WHERE id=$9 AND actif=TRUE RETURNING *
      `, [
        nom, type_energie, type_compteur || 'physique', unite || 'kWh', reference,
        sim_active !== undefined ? !!sim_active : null,
        sim_interval_seconds ? parseInt(sim_interval_seconds) : null,
        sim_retention_hours ? parseInt(sim_retention_hours) : null,
        req.params.id,
      ]);
      if (rows.length === 0) return res.status(404).json({ error: 'Compteur non trouvé' });
      const compteur = rows[0];
      syncSim(compteur);
      res.json(compteur);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// PATCH /compteurs/:id/simulation — toggle rapide sans toucher aux autres champs
router.patch('/:id/simulation', requireRole('gestionnaire'), async (req, res) => {
  try {
    const { sim_active, sim_interval_seconds, sim_retention_hours } = req.body;
    const { rows } = await pool.query(`
      UPDATE compteur
      SET sim_active=COALESCE($1, sim_active),
          sim_interval_seconds=COALESCE($2, sim_interval_seconds),
          sim_retention_hours=COALESCE($3, sim_retention_hours)
      WHERE id=$4 AND actif=TRUE RETURNING *
    `, [
      sim_active !== undefined ? !!sim_active : null,
      sim_interval_seconds ? parseInt(sim_interval_seconds) : null,
      sim_retention_hours ? parseInt(sim_retention_hours) : null,
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Compteur non trouvé' });
    const compteur = rows[0];
    syncSim(compteur);
    res.json(compteur);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /compteurs/:id (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    sim.stopMeter(req.params.id);
    await pool.query('UPDATE compteur SET actif=FALSE, sim_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Compteur désactivé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function startSim(c) {
  sim.startMeter(c.id, c.sim_interval_seconds);
}

function syncSim(c) {
  if (c.sim_active) {
    sim.startMeter(c.id, c.sim_interval_seconds);
  } else {
    sim.stopMeter(c.id);
  }
}

module.exports = router;
