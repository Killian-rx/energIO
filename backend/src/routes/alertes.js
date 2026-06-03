const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

// GET /alertes?traitee=false&limit=50
router.get('/', async (req, res) => {
  try {
    const { traitee, niveau, limit = 100 } = req.query;
    const conditions = [];
    const params = [];

    if (traitee !== undefined) {
      params.push(traitee === 'true');
      conditions.push(`a.traitee = $${params.length}`);
    }
    if (niveau) {
      params.push(niveau);
      conditions.push(`a.niveau = $${params.length}`);
    }

    params.push(Math.min(parseInt(limit) || 100, 500));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT a.*,
             s.nom AS site_nom,
             c.nom AS compteur_nom, c.type_energie,
             ra.nom AS regle_nom,
             u.nom || ' ' || u.prenom AS traite_par_nom
      FROM alerte a
      LEFT JOIN site s           ON a.site_id = s.id
      LEFT JOIN compteur c       ON a.compteur_id = c.id
      LEFT JOIN regle_alerte ra  ON a.regle_id = ra.id
      LEFT JOIN utilisateur u    ON a.traitee_par = u.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${params.length}
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /alertes/:id/traiter — marquer comme traitée (gestionnaire+)
router.patch('/:id/traiter', requireRole('gestionnaire'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE alerte
      SET traitee=TRUE, traitee_par=$1, traitee_at=NOW()
      WHERE id=$2 AND traitee=FALSE
      RETURNING *
    `, [req.user.id, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Alerte non trouvée ou déjà traitée' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /alertes/stats — statistiques des alertes
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NOT traitee)              AS en_attente,
        COUNT(*) FILTER (WHERE traitee)                  AS traitees,
        COUNT(*) FILTER (WHERE niveau='critical' AND NOT traitee) AS critiques,
        COUNT(*) FILTER (WHERE niveau='warning'  AND NOT traitee) AS warnings,
        COUNT(*) FILTER (WHERE niveau='info'     AND NOT traitee) AS infos,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS cette_semaine
      FROM alerte
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
