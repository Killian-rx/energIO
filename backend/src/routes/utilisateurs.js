const express = require('express');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /utilisateurs
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nom, prenom, email, role, actif, created_at
      FROM utilisateur ORDER BY nom, prenom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /utilisateurs/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom, email, role, actif FROM utilisateur WHERE id=$1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /utilisateurs/:id
router.put('/:id',
  body('nom').notEmpty().trim(),
  body('prenom').notEmpty().trim(),
  body('role').isIn(['admin','gestionnaire','utilisateur']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nom, prenom, role, actif, password } = req.body;
    try {
      let query, params;
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        query = 'UPDATE utilisateur SET nom=$1, prenom=$2, role=$3, actif=$4, mot_de_passe=$5 WHERE id=$6 RETURNING id, nom, prenom, email, role, actif';
        params = [nom, prenom, role, actif !== false, hash, req.params.id];
      } else {
        query = 'UPDATE utilisateur SET nom=$1, prenom=$2, role=$3, actif=$4 WHERE id=$5 RETURNING id, nom, prenom, email, role, actif';
        params = [nom, prenom, role, actif !== false, req.params.id];
      }
      const { rows } = await pool.query(query, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// DELETE /utilisateurs/:id
router.delete('/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
  }
  try {
    await pool.query('UPDATE utilisateur SET actif=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: 'Compte désactivé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
