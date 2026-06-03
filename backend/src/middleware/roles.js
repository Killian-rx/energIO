const HIERARCHY = { admin: 3, gestionnaire: 2, utilisateur: 1 };

function requireRole(...roles) {
  return (req, res, next) => {
    const userLevel = HIERARCHY[req.user?.role] || 0;
    const required  = Math.max(...roles.map(r => HIERARCHY[r] || 0));
    if (userLevel < required) {
      return res.status(403).json({ error: 'Droits insuffisants' });
    }
    next();
  };
}

module.exports = { requireRole };
