const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

// POST /auth/login
router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const { rows } = await pool.query(
        'SELECT * FROM utilisateur WHERE email = $1 AND actif = TRUE',
        [email.toLowerCase()]
      );
      if (rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });

      const user = rows[0];
      const ok = await bcrypt.compare(password, user.mot_de_passe);
      if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// POST /auth/register (admin seulement)
router.post('/register',
  requireAuth,
  requireRole('admin'),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('nom').notEmpty(),
  body('prenom').notEmpty(),
  body('role').isIn(['admin', 'gestionnaire', 'utilisateur']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, nom, prenom, role } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, prenom, email, role`,
        [nom, prenom, email.toLowerCase(), hash, role]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' });
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom, email, role FROM utilisateur WHERE id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
